param(
  [string]$SiteRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$sourceFolder = Join-Path $SiteRoot '已经准备好的歌词'
$musicJson = Join-Path $SiteRoot 'data\music.json'

function Get-NormalizedTitle([string]$Text) {
  $value = $Text.Trim() -replace '^《', '' -replace '》歌词$', ''
  # Common Simplified/Traditional variants in this library.
  $value = $value.Replace('著', '着').Replace('臺', '台').Replace('萬', '万').Replace('種', '种').Replace('為', '为').Replace('與', '与')
  $value = $value -replace '\s*\(Hidden track\)$', ''
  return ($value -replace '\s', '').ToLowerInvariant()
}

function Test-BilingualLrc([string]$Path) {
  $lines = [System.Collections.Generic.List[object]]::new()
  foreach ($line in Get-Content -LiteralPath $Path -Encoding UTF8) {
    if ($line -match '^\[(\d{2}:\d{2}(?:\.\d{1,3})?)\](.+)$') {
      $parts = $matches[1].Split(':')
      $lines.Add([PSCustomObject]@{ At = [double]$parts[0] * 60 + [double]$parts[1]; Text = $matches[2].Trim() })
    }
  }
  $pairs = 0
  for ($index = 0; $index -lt $lines.Count - 1; $index++) {
    $first = $lines[$index]; $second = $lines[$index + 1]
    $hasCjk = ($first.Text -match '[\u4e00-\u9fff]' -or $second.Text -match '[\u4e00-\u9fff]')
    $hasLatin = ($first.Text -match '[A-Za-z]' -or $second.Text -match '[A-Za-z]')
    $metadata = ($first.Text -match '^(Lyrics|Composed|Arranged|Produced|TME|作词|作曲|编曲|监制)' -or $second.Text -match '^(Lyrics|Composed|Arranged|Produced|TME|作词|作曲|编曲|监制)')
    if ($hasCjk -and $hasLatin -and -not $metadata -and [math]::Abs($second.At - $first.At) -le 1.65) { $pairs++; $index++ }
  }
  return $pairs -ge 3
}

if (-not (Test-Path -LiteralPath $sourceFolder)) { throw "Lyrics folder not found: $sourceFolder" }
$data = Get-Content -Raw -Encoding UTF8 $musicJson | ConvertFrom-Json
$report = [System.Collections.Generic.List[object]]::new()

Get-ChildItem -LiteralPath $sourceFolder -File -Filter '*.lrc' | ForEach-Object {
  $lyric = $_
  $wantedTitle = Get-NormalizedTitle $lyric.BaseName
  $bilingual = Test-BilingualLrc $lyric.FullName
  $targets = @()
  foreach ($album in $data.albums) {
    foreach ($track in $album.tracks) {
      if ((Get-NormalizedTitle $track.title) -eq $wantedTitle) {
        $targets += [PSCustomObject]@{ Album = $album; Track = $track }
      }
    }
  }
  if ($targets.Count -eq 0) {
    $report.Add([PSCustomObject]@{ Lyric = $lyric.Name; Status = 'unmatched'; Targets = '' })
    return
  }
  foreach ($target in $targets) {
    $relativeLrc = [IO.Path]::ChangeExtension($target.Track.src, 'lrc').Replace('\', '/')
    $destination = Join-Path $SiteRoot ($relativeLrc -replace '/', '\\')
    Copy-Item -LiteralPath $lyric.FullName -Destination $destination -Force
    $target.Track.lyrics = $relativeLrc
    $target.Track | Add-Member -NotePropertyName bilingual -NotePropertyValue $bilingual -Force
  }
  $report.Add([PSCustomObject]@{ Lyric = $lyric.Name; Status = if ($bilingual) { 'imported-bilingual' } else { 'imported' }; Targets = ($targets | ForEach-Object { "$($_.Album.title) / $($_.Track.title)" }) -join ' | ' })
}

$data | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $musicJson -Encoding UTF8
$report | Format-Table -AutoSize
