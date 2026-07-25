param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('video','note','album','sync')]
  [string]$Mode
)

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$dataRoot = Join-Path $root 'data'

function Read-JsonFile([string]$path) { Get-Content -Raw -Encoding UTF8 -LiteralPath $path | ConvertFrom-Json }
function Save-JsonFile([object]$value, [string]$path) { $value | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 -LiteralPath $path }

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
  Write-Host 'Sync all album photos and covers'
  $path = Join-Path $dataRoot 'albums.json'
  $data = Read-JsonFile $path
  $albumRoot = Join-Path $root 'album'
  $imagePattern = '\.(jpg|jpeg|png|webp|gif|avif)$'
  $updated = 0
  foreach ($entry in $data.albums) {
    $folder = Join-Path $albumRoot $entry.id
    if (-not (Test-Path -LiteralPath $folder)) { Write-Warning "Folder not found: $folder"; continue }
    $images = @(Get-ChildItem -LiteralPath $folder -File -Recurse | Where-Object { $_.Name -match $imagePattern } | Sort-Object FullName)
    $coverFile = @($images | Where-Object { $_.BaseName -ieq 'cover' } | Select-Object -First 1)
    if ($coverFile.Count -gt 0) {
      $entry.cover = $coverFile[0].FullName.Substring($root.Length + 1).Replace('\','/')
      $images = @($coverFile[0]) + @($images | Where-Object { $_.FullName -ne $coverFile[0].FullName })
    } else {
      $entry.cover = ''
      Write-Warning "No cover image in: $folder"
    }
    $entry.photos = @($images | ForEach-Object { $_.FullName.Substring($root.Length + 1).Replace('\','/') })
    Write-Host "Synced $($entry.title): $($entry.photos.Count) photo(s)" -ForegroundColor Green
    $updated++
  }
  Save-JsonFile $data $path
  Write-Host "Album sync complete: $updated chapter(s)" -ForegroundColor Green
}
