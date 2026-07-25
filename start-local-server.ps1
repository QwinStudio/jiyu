$siteRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add('http://localhost:8080/')
$listener.Start()
Write-Host 'Site running at http://localhost:8080/' -ForegroundColor Cyan
Write-Host 'Keep this window open. Press Ctrl+C to stop.'

$mime = @{'.html'='text/html; charset=utf-8';'.css'='text/css; charset=utf-8';'.js'='application/javascript; charset=utf-8';'.json'='application/json; charset=utf-8';'.svg'='image/svg+xml';'.png'='image/png';'.jpg'='image/jpeg';'.jpeg'='image/jpeg';'.mp4'='video/mp4';'.ttf'='font/ttf';'.otf'='font/otf';'.md'='text/markdown; charset=utf-8'}
while ($listener.IsListening) {
  $context = $listener.GetContext()
  $relative = [uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart('/'))
  if ([string]::IsNullOrWhiteSpace($relative)) { $relative = 'index.html' }
  $candidate = [IO.Path]::GetFullPath((Join-Path $siteRoot $relative))
  if (-not $candidate.StartsWith([IO.Path]::GetFullPath($siteRoot)) -or -not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
    $context.Response.StatusCode = 404
    $context.Response.Close()
    continue
  }
  $extension = [IO.Path]::GetExtension($candidate).ToLowerInvariant()
  $context.Response.ContentType = if ($mime.ContainsKey($extension)) { $mime[$extension] } else { 'application/octet-stream' }
  $bytes = [IO.File]::ReadAllBytes($candidate)
  $context.Response.ContentLength64 = $bytes.Length
  $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $context.Response.Close()
}
