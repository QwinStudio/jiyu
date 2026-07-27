param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('video','note','album','sync','music','lyrics','index','version')]
  [string]$Mode
)

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$dataRoot = Join-Path $root 'data'

function Read-JsonFile([string]$path) { Get-Content -Raw -Encoding UTF8 -LiteralPath $path | ConvertFrom-Json }
function Save-JsonFile([object]$value, [string]$path) { $value | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 -LiteralPath $path }
function New-Thumbnail([object]$imageFile, [string]$folder) {
  try {
    Add-Type -AssemblyName System.Drawing
    $thumbFolder = Join-Path $folder '.thumbnails'
    New-Item -ItemType Directory -Force -Path $thumbFolder | Out-Null
    $destination = Join-Path $thumbFolder ($imageFile.BaseName + '.jpg')
    if ((Test-Path -LiteralPath $destination) -and ((Get-Item -LiteralPath $destination).LastWriteTime -ge $imageFile.LastWriteTime)) { return $destination }
    $source = [System.Drawing.Image]::FromFile($imageFile.FullName)
    try {
      $width = [Math]::Min(640, $source.Width)
      $height = [Math]::Max(1, [int][Math]::Round($source.Height * $width / $source.Width))
      $bitmap = New-Object System.Drawing.Bitmap($width, $height)
      try {
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        try { $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic; $graphics.DrawImage($source, 0, 0, $width, $height) } finally { $graphics.Dispose() }
        $bitmap.Save($destination, [System.Drawing.Imaging.ImageFormat]::Jpeg)
      } finally { $bitmap.Dispose() }
    } finally { $source.Dispose() }
    return $destination
  } catch { Write-Warning "Thumbnail skipped: $($imageFile.Name)"; return $null }
}

function Get-CoverAccent([string]$coverPath) {
  if ([string]::IsNullOrWhiteSpace($coverPath) -or -not (Test-Path -LiteralPath $coverPath)) { return $null }
  try {
    Add-Type -AssemblyName System.Drawing
    $source = [System.Drawing.Image]::FromFile($coverPath)
    try {
      $canvas = New-Object System.Drawing.Bitmap(48, 48)
      try {
        $graphics = [System.Drawing.Graphics]::FromImage($canvas)
        try { $graphics.DrawImage($source, 0, 0, 48, 48) } finally { $graphics.Dispose() }
        $bins = @{}
        for ($x = 0; $x -lt 48; $x += 2) {
          for ($y = 0; $y -lt 48; $y += 2) {
            $pixel = $canvas.GetPixel($x, $y)
            if ($pixel.A -lt 180) { continue }
            $r = [Math]::Min(255, [int]([Math]::Floor($pixel.R / 32) * 32 + 16))
            $g = [Math]::Min(255, [int]([Math]::Floor($pixel.G / 32) * 32 + 16))
            $b = [Math]::Min(255, [int]([Math]::Floor($pixel.B / 32) * 32 + 16))
            $key = '{0:X2}{1:X2}{2:X2}' -f $r, $g, $b
            $bins[$key] = 1 + [int]($bins[$key] | ForEach-Object { $_ })
          }
        }
        if ($bins.Count -eq 0) { return $null }
        return '#' + (($bins.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 1).Key)
      } finally { $canvas.Dispose() }
    } finally { $source.Dispose() }
  } catch { Write-Warning "Accent extraction skipped: $coverPath"; return $null }
}

function Get-MusicNameParts([string]$baseName, [string]$fallbackArtist) {
  $clean = ($baseName -replace '^[0-9]+[-_ ]*', '').Trim()
  $match = [regex]::Match($clean, '^(.+?)\s*-\s*(.+)$')
  if ($match.Success) {
    return [pscustomobject]@{ Artist=$match.Groups[1].Value.Trim(); Title=$match.Groups[2].Value.Trim() }
  }
  return [pscustomobject]@{ Artist=$fallbackArtist; Title=$clean }
}

function Get-StableMusicTrackId([string]$text) {
  $bytes = [Text.Encoding]::UTF8.GetBytes($text)
  $hash = [Security.Cryptography.SHA1]::Create().ComputeHash($bytes)
  return 'track-' + (-join ($hash[0..5] | ForEach-Object { $_.ToString('x2') }))
}

function Get-SyncSafeInt([byte[]]$bytes, [int]$offset) {
  return (($bytes[$offset] -band 0x7f) -shl 21) -bor (($bytes[$offset + 1] -band 0x7f) -shl 14) -bor (($bytes[$offset + 2] -band 0x7f) -shl 7) -bor ($bytes[$offset + 3] -band 0x7f)
}

function Export-EmbeddedAudioCover([object]$audioFile, [string]$folder) {
  try {
    # ID3v2 APIC frame: only used as a fallback when no cover.* file exists.
    $bytes = [IO.File]::ReadAllBytes($audioFile.FullName)
    if ($bytes.Length -lt 20 -or [Text.Encoding]::ASCII.GetString($bytes,0,3) -ne 'ID3') { return $null }
    $version = [int]$bytes[3]
    if ($version -notin 3,4) { return $null }
    $tagEnd = [Math]::Min($bytes.Length, 10 + (Get-SyncSafeInt $bytes 6))
    $offset = 10
    while ($offset + 10 -le $tagEnd) {
      $frameId = [Text.Encoding]::ASCII.GetString($bytes,$offset,4)
      if ([string]::IsNullOrWhiteSpace($frameId.Trim([char]0))) { break }
      $frameSize = if ($version -eq 4) { Get-SyncSafeInt $bytes ($offset + 4) } else { (($bytes[$offset+4] -shl 24) -bor ($bytes[$offset+5] -shl 16) -bor ($bytes[$offset+6] -shl 8) -bor $bytes[$offset+7]) }
      $dataStart = $offset + 10
      if ($frameSize -le 0 -or $dataStart + $frameSize -gt $bytes.Length) { break }
      if ($frameId -eq 'APIC') {
        $cursor = $dataStart + 1 # text encoding
        $mimeEnd = $cursor; while ($mimeEnd -lt $dataStart + $frameSize -and $bytes[$mimeEnd] -ne 0) { $mimeEnd++ }
        $mime = [Text.Encoding]::ASCII.GetString($bytes,$cursor,$mimeEnd-$cursor).ToLowerInvariant()
        $cursor = $mimeEnd + 2 # null terminator + picture type
        $encoding = $bytes[$dataStart]
        if ($encoding -in 1,2) { while ($cursor + 1 -lt $dataStart + $frameSize -and -not ($bytes[$cursor] -eq 0 -and $bytes[$cursor+1] -eq 0)) { $cursor += 2 }; $cursor += 2 }
        else { while ($cursor -lt $dataStart + $frameSize -and $bytes[$cursor] -ne 0) { $cursor++ }; $cursor++ }
        if ($cursor -ge $dataStart + $frameSize) { return $null }
        $extension = if ($mime -match 'png') { '.png' } elseif ($mime -match 'webp') { '.webp' } else { '.jpg' }
        $destination = Join-Path $folder ('cover' + $extension)
        $imageBytes = New-Object byte[] ($dataStart + $frameSize - $cursor)
        [Array]::Copy($bytes,$cursor,$imageBytes,0,$imageBytes.Length)
        # Album art is never this small in practice; skipping it also avoids
        # sending truncated APIC payloads to the JPEG decoder.
        if ($imageBytes.Length -lt 1024) { return $null }
        # Do not leave a broken cover file behind when an APIC frame is malformed.
        $stream = New-Object IO.MemoryStream(,$imageBytes)
        try {
          $image = [System.Drawing.Image]::FromStream($stream)
          try { if ($image.Width -lt 16 -or $image.Height -lt 16) { return $null } }
          finally { $image.Dispose() }
        } finally { $stream.Dispose() }
        [IO.File]::WriteAllBytes($destination,$imageBytes)
        return Get-Item -LiteralPath $destination
      }
      $offset = $dataStart + $frameSize
    }
  } catch { Write-Warning "Embedded cover extraction skipped: $($audioFile.Name)" }
  return $null
}

if ($Mode -eq 'video') {
  Write-Host ''
  Write-Host 'Add video'
  $number = Read-Host 'Cover number (for example: 21, uses media/vid/21.png)'
  if ([string]::IsNullOrWhiteSpace($number)) { throw 'Cover number is required.' }
  $title = Read-Host 'Video title'
  $date = Read-Host 'Creation date (for example: 2026.07.25)'
  $description = Read-Host 'Description (optional)'
  $bilibili = Read-Host 'Bilibili URL (optional)'
  $douyin = Read-Host 'Douyin URL (optional)'
  $xiaohongshu = Read-Host 'Xiaohongshu URL (optional)'
  $cover = "media/vid/$number.png"
  if (-not (Test-Path -LiteralPath (Join-Path $root $cover))) { Write-Warning "Cover not found yet: $cover" }
  $path = Join-Path $dataRoot 'videos-12-20.json'
  $data = Read-JsonFile $path
  $entry = [pscustomobject]@{ id = "video-$number"; title = $title; date = $date; description = $description; cover = $cover; bilibili = $bilibili; douyin = $douyin; xiaohongshu = $xiaohongshu }
  $data.videos = @($data.videos) + @($entry)
  Save-JsonFile $data $path
  Write-Host "Video added: $title" -ForegroundColor Green
}

if ($Mode -eq 'note') {
  Write-Host ''
  Write-Host 'Add note'
  $title = Read-Host 'Note title'
  Write-Host 'Enter body lines. Type a single period (.) to finish:'
  $lines = [System.Collections.Generic.List[string]]::new()
  while ($true) { $line = Read-Host; if ($line -eq '.') { break }; $lines.Add($line) }
  $body = $lines -join [Environment]::NewLine
  if ([string]::IsNullOrWhiteSpace($body)) { $body = '(empty note)' }
  $now = Get-Date
  $date = $now.ToString('yyyy.MM.dd')
  $fileName = "note-$($now.ToString('yyyyMMddHHmmss')).md"
  $relativeFile = "notes/$fileName"
  $markdownPath = Join-Path $root $relativeFile
  "# $title`n`n$body" | Set-Content -Encoding UTF8 -LiteralPath $markdownPath
  $path = Join-Path $dataRoot 'content.json'
  $data = Read-JsonFile $path
  $excerpt = if ($body.Length -gt 70) { $body.Substring(0,70) + '...' } else { $body }
  $entry = [pscustomobject]@{ title = $title; date = $date; excerpt = $excerpt; file = $relativeFile }
  $data.notes = @($entry) + @($data.notes)
  Save-JsonFile $data $path
  Write-Host "Note added: $title" -ForegroundColor Green
}

if ($Mode -eq 'album') {
  Write-Host ''
  Write-Host 'Add travel album chapter'
  $id = Read-Host 'Unique id (for example: beijing-2026)'
  $title = Read-Host 'Album title'
  $place = Read-Host 'Place'
  $date = Read-Host 'Date (for example: 2026.07)'
  $description = Read-Host 'Short travel description'
  $albumFolder = Join-Path (Join-Path $root 'album') $id
  New-Item -ItemType Directory -Force -Path $albumFolder | Out-Null
  $cover = "album/$id/cover.jpg"
  Write-Host "Created folder: $albumFolder"
  Write-Host "Put the cover image at: $cover"
  $photoText = Read-Host 'Photo paths, separated by commas (optional)'
  $photos = @($photoText.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  if ($photos.Count -eq 0) { $photos = @($cover) }
  $path = Join-Path $dataRoot 'albums.json'
  $data = Read-JsonFile $path
  $entry = [pscustomobject]@{ id = $id; title = $title; place = $place; date = $date; description = $description; cover = $cover; photos = $photos }
  $data.albums = @($data.albums) + @($entry)
  Save-JsonFile $data $path
  Write-Host "Album added: $title" -ForegroundColor Green
}

if ($Mode -eq 'sync') {
  Write-Host ''
  Write-Host 'Sync albums, covers and thumbnails'
  $path = Join-Path $dataRoot 'albums.json'
  $data = Read-JsonFile $path
  $albumRoot = Join-Path $root 'album'
  $imagePattern = '\.(jpg|jpeg|png|webp|gif|avif)$'
  $updated = 0
  foreach ($entry in $data.albums) {
    $folder = Join-Path $albumRoot $entry.id
    if (-not (Test-Path -LiteralPath $folder)) { Write-Warning "Folder not found: $folder"; continue }
    $images = @(Get-ChildItem -LiteralPath $folder -File -Recurse | Where-Object { $_.Name -match $imagePattern -and $_.FullName -notmatch '\\.thumbnails\\' } | Sort-Object FullName)
    $coverFile = @($images | Where-Object { $_.BaseName -ieq 'cover' } | Select-Object -First 1)
    if ($coverFile.Count -gt 0) {
      $entry.cover = $coverFile[0].FullName.Substring($root.Length + 1).Replace('\','/')
      $images = @($coverFile[0]) + @($images | Where-Object { $_.FullName -ne $coverFile[0].FullName })
    } else {
      $entry.cover = ''
      Write-Warning "No cover image in: $folder"
    }
    $entry.photos = @($images | ForEach-Object { $_.FullName.Substring($root.Length + 1).Replace('\','/') })
    $thumbnails = @($images | ForEach-Object { $thumb = New-Thumbnail $_ $folder; if ($thumb) { $thumb.Substring($root.Length + 1).Replace('\','/') } })
    $entry | Add-Member -NotePropertyName thumbnails -NotePropertyValue $thumbnails -Force
    Write-Host "Synced $($entry.title): $($entry.photos.Count) photo(s), $($thumbnails.Count) thumbnail(s)" -ForegroundColor Green
    $updated++
  }
  Save-JsonFile $data $path
  Write-Host "Album sync complete: $updated chapter(s)" -ForegroundColor Green
}

if ($Mode -eq 'music') {
  Write-Host ''
  Write-Host 'Sync music folders, albums, covers, audio files and lyrics'
  $path = Join-Path $dataRoot 'music.json'
  $data = Read-JsonFile $path
  $musicRoot = Join-Path $root 'media\music'
  $audioPattern = '\.(mp3|m4a|aac|wav|ogg|flac)$'
  $coverPattern = '\.(jpg|jpeg|png|webp|avif)$'
  $existing = @{}
  foreach ($album in @($data.albums)) { $existing[$album.id] = $album }
  $syncedAlbums = [System.Collections.Generic.List[object]]::new()
  $folders = @(Get-ChildItem -LiteralPath $musicRoot -Directory | Sort-Object Name)
  foreach ($folderInfo in $folders) {
    # The folder name is intentionally the public album ID and title. This keeps
    # media/music/<folder>/ self-contained and removes any manual mapping step.
    $albumId = $folderInfo.Name
    $folder = $folderInfo.FullName
    $album = $existing[$albumId]
    if ($null -eq $album) {
      $album = [pscustomobject]@{ id=$albumId; title=$albumId; subtitle=''; artist='Unknown artist'; year=(Get-Date -Format 'yyyy'); palette=@('#15d6ff','#6967ff','#ff8bb3'); cover=''; tracks=@() }
    }
    $album.id = $albumId
    $album.title = $folderInfo.Name
    $audioFiles = @(Get-ChildItem -LiteralPath $folder -File | Where-Object { $_.Name -match $audioPattern } | Sort-Object Name)
    $cover = Get-ChildItem -LiteralPath $folder -File | Where-Object { $_.BaseName -ieq 'cover' -and $_.Extension -match $coverPattern } | Select-Object -First 1
    $invalidSmallCover = $cover -and $cover.Length -lt 1024
    if ($invalidSmallCover) { $cover = $null }
    elseif ($cover -and -not (Get-CoverAccent $cover.FullName)) { $cover = $null }
    if ($null -eq $cover -and -not $invalidSmallCover -and $audioFiles.Count -gt 0) {
      $cover = Export-EmbeddedAudioCover $audioFiles[0] $folder
      if ($cover) { Write-Host "Extracted embedded cover: $($cover.Name)" -ForegroundColor DarkCyan }
    }
    $album | Add-Member -NotePropertyName cover -NotePropertyValue $(if($cover){$cover.FullName.Substring($root.Length + 1).Replace('\','/')}else{''}) -Force
    $parsed = @($audioFiles | ForEach-Object { Get-MusicNameParts $_.BaseName $album.artist })
    $artist = @($parsed | Where-Object { -not [string]::IsNullOrWhiteSpace($_.Artist) } | Group-Object Artist | Sort-Object -Property @{Expression='Count';Descending=$true}, @{Expression='Name';Descending=$false} | Select-Object -First 1).Name
    if (-not [string]::IsNullOrWhiteSpace($artist)) { $album.artist = $artist }
    # The management card and the public music card use subtitle as the author.
    $album.subtitle = $album.artist
    $accent = if ($cover) { Get-CoverAccent $cover.FullName } else { $null }
    if ($accent) {
      # First palette value is used by the player as its accent/background color.
      $album.palette = @($accent, $accent, $accent)
    }
    $oldTracks = @{}
    foreach ($track in @($album.tracks)) { $oldTracks[$track.id] = $track }
    $tracks = [System.Collections.Generic.List[object]]::new()
    foreach ($audio in $audioFiles) {
      $id = Get-StableMusicTrackId $audio.Name
      $entry = $oldTracks[$id]
      $relative = $audio.FullName.Substring($root.Length + 1).Replace('\','/')
      $lyricFile = Join-Path $folder ($audio.BaseName + '.lrc')
      $lyric = if(Test-Path -LiteralPath $lyricFile){$lyricFile.Substring($root.Length + 1).Replace('\','/')}else{$null}
      $parts = Get-MusicNameParts $audio.BaseName $album.artist
      if ($null -eq $entry) {
        $entry = [pscustomobject]@{ id=$id; title=$parts.Title; artist=$parts.Artist; duration='--:--'; src=$relative; lyrics=$lyric }
      } else { $entry.title=$parts.Title; $entry.artist=$parts.Artist; $entry.src=$relative; $entry.lyrics=$lyric }
      $tracks.Add($entry)
    }
    $album.tracks = @($tracks)
    $syncedAlbums.Add($album)
    Write-Host "Synced $($album.title): $($album.tracks.Count) track(s)" -ForegroundColor Green
  }
  $data.albums = @($syncedAlbums)
  Save-JsonFile $data $path
}

if ($Mode -eq 'lyrics') {
  Write-Host ''
  Write-Host 'Sync lyric files matched by audio filename'
  $path = Join-Path $dataRoot 'music.json'
  $data = Read-JsonFile $path
  $updated = 0
  foreach ($album in @($data.albums)) {
    foreach ($track in @($album.tracks)) {
      if ([string]::IsNullOrWhiteSpace($track.src)) { continue }
      $audioPath = Join-Path $root $track.src
      $lrcPath = [IO.Path]::ChangeExtension($audioPath, 'lrc')
      if (-not (Test-Path -LiteralPath $lrcPath)) { $lrcPath = [IO.Path]::ChangeExtension($audioPath, 'txt') }
      $relative = if (Test-Path -LiteralPath $lrcPath) { $lrcPath.Substring($root.Length + 1).Replace('\','/') } else { $null }
      if ($track.lyrics -ne $relative) { $track.lyrics = $relative; $updated++ }
    }
  }
  Save-JsonFile $data $path
  Write-Host "Lyric sync complete: $updated track(s) updated" -ForegroundColor Green
}

if ($Mode -eq 'index') {
  Write-Host ''
  Write-Host 'Build search index'
  $content = Read-JsonFile (Join-Path $dataRoot 'content.json')
  $extraVideos = Read-JsonFile (Join-Path $dataRoot 'videos-12-20.json')
  $albums = Read-JsonFile (Join-Path $dataRoot 'albums.json')
  $music = Read-JsonFile (Join-Path $dataRoot 'music.json')
  $externalMusicPath = Join-Path $dataRoot 'external-music.json'
  $externalMusic = if (Test-Path -LiteralPath $externalMusicPath) { Read-JsonFile $externalMusicPath } else { [pscustomobject]@{ items=@() } }
  $items = [System.Collections.Generic.List[object]]::new()
  foreach ($video in @($content.videos) + @($extraVideos.videos)) {
    $items.Add([pscustomobject]@{ type = 'video'; title = $video.title; date = $video.date; description = $video.description; url = 'videos.html'; keywords = "$($video.title) $($video.description) $($video.date)" })
  }
  foreach ($note in @($content.notes)) {
    $notePath = Join-Path $root $note.file
    $body = if (Test-Path -LiteralPath $notePath) { Get-Content -Raw -Encoding UTF8 -LiteralPath $notePath } else { '' }
    $items.Add([pscustomobject]@{ type = 'note'; title = $note.title; date = $note.date; description = $note.excerpt; url = "note.html?file=$([uri]::EscapeDataString($note.file))"; keywords = "$($note.title) $($note.excerpt) $body $($note.date)" })
  }
  foreach ($album in @($albums.albums)) {
    $country = if ($null -ne $album.country) { $album.country } else { '' }
    $items.Add([pscustomobject]@{ type = 'album'; title = $album.title; date = $album.date; description = "$country / $($album.place) $($album.description)"; url = "album-chapter.html?chapter=$($album.id)"; keywords = "$($album.title) $country $($album.place) $($album.description) $($album.date)" })
  }
  foreach ($album in @($music.albums)) {
    foreach ($track in @($album.tracks)) {
      $items.Add([pscustomobject]@{ type = 'music'; title = $track.title; date = $album.year; description = "$($track.artist) / $($album.title)"; url = "music-player.html?album=$($album.id)&track=$($track.id)"; keywords = "$($track.title) $($track.artist) $($album.title) $($album.subtitle)" })
    }
  }
  foreach ($item in @($externalMusic.items)) {
    $items.Add([pscustomobject]@{ type = 'music'; title = $item.title; date = $item.platform; description = "$($item.artist) / $($item.platform)"; url = $item.url; keywords = "$($item.title) $($item.artist) $($item.platform) $($item.description)" })
  }
  Save-JsonFile ([pscustomobject]@{ generatedAt = (Get-Date).ToString('s'); items = @($items) }) (Join-Path $dataRoot 'search-index.json')
  Write-Host "Search index updated: $($items.Count) item(s)" -ForegroundColor Green
}

if ($Mode -eq 'version') {
  Write-Host ''
  Write-Host 'Update site version'
  $version = Read-Host 'Version number (for example: 2.171)'
  if ([string]::IsNullOrWhiteSpace($version)) { throw 'Version number is required.' }
  Save-JsonFile ([pscustomobject]@{ version = $version.Trim() }) (Join-Path $dataRoot 'site-config.json')
  Write-Host "Site version updated: $($version.Trim())" -ForegroundColor Green
}
