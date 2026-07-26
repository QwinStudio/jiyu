param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('video','note','album','sync','index','version')]
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

if ($Mode -eq 'index') {
  Write-Host ''
  Write-Host 'Build search index'
  $content = Read-JsonFile (Join-Path $dataRoot 'content.json')
  $extraVideos = Read-JsonFile (Join-Path $dataRoot 'videos-12-20.json')
  $albums = Read-JsonFile (Join-Path $dataRoot 'albums.json')
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
