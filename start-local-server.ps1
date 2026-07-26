$ErrorActionPreference = 'Stop'
$siteRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$dataRoot = Join-Path $siteRoot 'data'

function Read-Data([string]$name) {
  $path = Join-Path $dataRoot $name
  return (Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json)
}
function Save-Data([string]$name, [object]$value) {
  $path = Join-Path $dataRoot $name
  $value | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $path -Encoding UTF8
}
function Get-AdminData {
  return [ordered]@{
    content = Read-Data 'content.json'
    extraVideos = Read-Data 'videos-12-20.json'
    albums = Read-Data 'albums.json'
    config = Read-Data 'site-config.json'
  }
}
function Send-Json($response, [int]$status, [object]$payload) {
  $bytes = [Text.Encoding]::UTF8.GetBytes(($payload | ConvertTo-Json -Depth 20 -Compress))
  $response.StatusCode = $status
  $response.ContentType = 'application/json; charset=utf-8'
  $response.ContentLength64 = $bytes.Length
  $response.OutputStream.Write($bytes, 0, $bytes.Length)
}
function Get-BodyValue($body, [string]$name, [string]$fallback = '') {
  $property = $body.PSObject.Properties[$name]
  if ($null -eq $property -or $null -eq $property.Value) { return $fallback }
  return [string]$property.Value
}
function Get-Excerpt([string]$text) {
  $plain = ($text -replace '[#*_>`\[\]\(\)]', '' -replace '\s+', ' ').Trim()
  if ($plain.Length -gt 70) { return $plain.Substring(0, 70) + '...' }
  return $plain
}
function Invoke-ContentTool([string]$mode) {
  $script = Join-Path $siteRoot 'tools\content-manager.ps1'
  if (-not (Test-Path -LiteralPath $script)) { throw 'Content manager tool is missing.' }
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script -Mode $mode 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Content manager tool failed: $mode" }
}
function Invoke-AdminAction($body) {
  $action = Get-BodyValue $body 'action'
  switch ($action) {
    'addVideo' {
      $number = Get-BodyValue $body 'number'
      $title = Get-BodyValue $body 'title'
      if ([string]::IsNullOrWhiteSpace($number) -or [string]::IsNullOrWhiteSpace($title)) { throw 'Cover number and title are required.' }
      if ($number -notmatch '^[A-Za-z0-9_-]+$') { throw 'The cover number contains unsupported characters.' }
      $data = Read-Data 'videos-12-20.json'
      $id = "video-$number"
      if (@($data.videos | Where-Object { $_.id -eq $id }).Count -gt 0) { throw 'This video number already exists.' }
      $entry = [pscustomobject]@{ id=$id; title=$title; date=(Get-BodyValue $body 'date'); description=(Get-BodyValue $body 'description'); cover="media/vid/$number.png"; bilibili=(Get-BodyValue $body 'bilibili'); douyin=(Get-BodyValue $body 'douyin'); xiaohongshu=(Get-BodyValue $body 'xiaohongshu') }
      $data.videos = @($data.videos) + @($entry)
      Save-Data 'videos-12-20.json' $data
    }
    'addNote' {
      $title = Get-BodyValue $body 'title'
      $noteBody = Get-BodyValue $body 'body'
      if ([string]::IsNullOrWhiteSpace($title)) { throw 'A note title is required.' }
      $stamp = Get-Date -Format 'yyyyMMddHHmmss'
      $relative = "notes/note-$stamp.md"
      $path = Join-Path $siteRoot $relative
      "# $title`n`n$noteBody" | Set-Content -LiteralPath $path -Encoding UTF8
      $data = Read-Data 'content.json'
      $entry = [pscustomobject]@{ title=$title; date=(Get-Date -Format 'yyyy.MM.dd'); excerpt=(Get-Excerpt $noteBody); file=$relative }
      $data.notes = @($entry) + @($data.notes)
      Save-Data 'content.json' $data
    }
    'setVersion' {
      $version = Get-BodyValue $body 'version'
      if ([string]::IsNullOrWhiteSpace($version)) { throw 'A version number is required.' }
      $config = Read-Data 'site-config.json'; $config.version = $version; Save-Data 'site-config.json' $config
    }
    'syncAlbums' { Invoke-ContentTool 'sync' }
    'buildIndex' { Invoke-ContentTool 'index' }
    'deleteItem' {
      $type = Get-BodyValue $body 'type'; $id = Get-BodyValue $body 'id'; $source = Get-BodyValue $body 'source'
      if ([string]::IsNullOrWhiteSpace($id)) { throw 'Content identifier is required.' }
      if ($type -eq 'video') {
        $name = if ($source -eq 'base') { 'content.json' } else { 'videos-12-20.json' }; $data = Read-Data $name
        $data.videos = @($data.videos | Where-Object { $_.id -ne $id }); Save-Data $name $data
      } elseif ($type -eq 'note') {
        $data = Read-Data 'content.json'; $entry = @($data.notes | Where-Object { $_.file -eq $id }) | Select-Object -First 1
        $data.notes = @($data.notes | Where-Object { $_.file -ne $id }); Save-Data 'content.json' $data
        if ($null -ne $entry) { $file = [IO.Path]::GetFullPath((Join-Path $siteRoot $entry.file)); if ($file.StartsWith($siteRoot) -and (Test-Path -LiteralPath $file)) { Remove-Item -LiteralPath $file -Force } }
      } elseif ($type -eq 'album') {
        $data = Read-Data 'albums.json'; $data.albums = @($data.albums | Where-Object { $_.id -ne $id }); Save-Data 'albums.json' $data
      } else { throw 'Unsupported content type.' }
    }
    'updateItem' {
      $type = Get-BodyValue $body 'type'; $id = Get-BodyValue $body 'id'; $source = Get-BodyValue $body 'source'; $title = Get-BodyValue $body 'title'
      if ([string]::IsNullOrWhiteSpace($id) -or [string]::IsNullOrWhiteSpace($title)) { throw 'Content identifier and title are required.' }
      if ($type -eq 'video') {
        $name = if ($source -eq 'base') { 'content.json' } else { 'videos-12-20.json' }; $data = Read-Data $name; $entry = @($data.videos | Where-Object { $_.id -eq $id }) | Select-Object -First 1
      } elseif ($type -eq 'note') {
        $name = 'content.json'; $data = Read-Data $name; $entry = @($data.notes | Where-Object { $_.file -eq $id }) | Select-Object -First 1
      } elseif ($type -eq 'album') {
        $name = 'albums.json'; $data = Read-Data $name; $entry = @($data.albums | Where-Object { $_.id -eq $id }) | Select-Object -First 1
      } else { throw 'Unsupported content type.' }
      if ($null -eq $entry) { throw 'Content to edit was not found.' }
      $entry.title = $title
      foreach ($field in @('date','description','bilibili','douyin','xiaohongshu','country','place')) { if ($null -ne $body.PSObject.Properties[$field]) { $entry.$field = Get-BodyValue $body $field } }
      if ($type -eq 'note' -and $null -ne $body.PSObject.Properties['body']) { $noteBody = Get-BodyValue $body 'body'; "# $title`n`n$noteBody" | Set-Content -LiteralPath (Join-Path $siteRoot $entry.file) -Encoding UTF8; $entry.excerpt = Get-Excerpt $noteBody }
      Save-Data $name $data
    }
    'reorderItem' {
      $type = Get-BodyValue $body 'type'; $id = Get-BodyValue $body 'id'; $source = Get-BodyValue $body 'source'; $direction = Get-BodyValue $body 'direction'
      if ($type -eq 'video') { $name = if ($source -eq 'base') { 'content.json' } else { 'videos-12-20.json' }; $data = Read-Data $name; $items = @($data.videos) }
      elseif ($type -eq 'note') { $name='content.json'; $data=Read-Data $name; $items=@($data.notes) }
      elseif ($type -eq 'album') { $name='albums.json'; $data=Read-Data $name; $items=@($data.albums) }
      else { throw 'Unsupported content type.' }
      $index = -1; for ($i=0; $i -lt $items.Count; $i++) { $key = if ($type -eq 'note') { $items[$i].file } else { $items[$i].id }; if ($key -eq $id) { $index = $i; break } }
      if ($index -lt 0) { throw 'Content to reorder was not found.' }
      $target = if ($direction -eq 'up') { $index - 1 } else { $index + 1 }
      if ($target -ge 0 -and $target -lt $items.Count) { $temp=$items[$index]; $items[$index]=$items[$target]; $items[$target]=$temp }
      if ($type -eq 'video') { $data.videos = $items } elseif ($type -eq 'note') { $data.notes = $items } else { $data.albums = $items }; Save-Data $name $data
    }
    default { throw 'Unknown management action.' }
  }
  return (Get-AdminData)
}

$listener = $null; $port = $null
foreach ($candidatePort in 8080..8089) {
  try { $tryListener = [System.Net.HttpListener]::new(); $tryListener.Prefixes.Add("http://localhost:$candidatePort/"); $tryListener.Start(); $listener=$tryListener; $port=$candidatePort; break }
  catch { if ($null -ne $tryListener) { try { $tryListener.Close() } catch {} } }
}
if ($null -eq $listener) { throw 'No available local port was found between 8080 and 8089.' }
Write-Host "Site and management API running at http://localhost:$port/" -ForegroundColor Cyan
Write-Host 'Keep this window open. Press Ctrl+C to stop.'
$mime = @{'.html'='text/html; charset=utf-8';'.css'='text/css; charset=utf-8';'.js'='application/javascript; charset=utf-8';'.json'='application/json; charset=utf-8';'.svg'='image/svg+xml';'.png'='image/png';'.jpg'='image/jpeg';'.jpeg'='image/jpeg';'.webp'='image/webp';'.mp4'='video/mp4';'.woff2'='font/woff2';'.md'='text/markdown; charset=utf-8'}
while ($listener.IsListening) {
  $context = $null
  try {
    $context = $listener.GetContext(); $request = $context.Request; $relative = [uri]::UnescapeDataString($request.Url.AbsolutePath.TrimStart('/'))
    if ($relative -eq 'api/admin') {
      if ($request.HttpMethod -eq 'GET') { Send-Json $context.Response 200 (Get-AdminData) }
      elseif ($request.HttpMethod -eq 'POST') { $reader=[IO.StreamReader]::new($request.InputStream,[Text.Encoding]::UTF8); try { $body=$reader.ReadToEnd() | ConvertFrom-Json; Send-Json $context.Response 200 ([ordered]@{ok=$true;data=(Invoke-AdminAction $body)}) } finally { $reader.Close() } }
      else { Send-Json $context.Response 405 ([ordered]@{ok=$false;error='Method not allowed'}) }
      continue
    }
    if ([string]::IsNullOrWhiteSpace($relative)) { $relative='index.html' }
    $candidate=[IO.Path]::GetFullPath((Join-Path $siteRoot $relative))
    if (-not $candidate.StartsWith([IO.Path]::GetFullPath($siteRoot)) -or -not (Test-Path -LiteralPath $candidate -PathType Leaf)) { $context.Response.StatusCode=404 }
    else { $extension=[IO.Path]::GetExtension($candidate).ToLowerInvariant(); $context.Response.ContentType=if($mime.ContainsKey($extension)){$mime[$extension]}else{'application/octet-stream'}; $bytes=[IO.File]::ReadAllBytes($candidate); $context.Response.ContentLength64=$bytes.Length; $context.Response.OutputStream.Write($bytes,0,$bytes.Length) }
  } catch [System.Net.HttpListenerException] {} catch [System.IO.IOException] {} catch { if ($null -ne $context) { try { Send-Json $context.Response 400 ([ordered]@{ok=$false;error=$_.Exception.Message}) } catch {} } }
  finally { if ($null -ne $context) { try{$context.Response.OutputStream.Close()}catch{}; try{$context.Response.Close()}catch{} } }
}
