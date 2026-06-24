$baseDir = "C:\Users\laptop 368\Desktop\my computer\code\websites\luonvuituoi.co"
$htmlFiles = Get-ChildItem -Path $baseDir -Recurse -Filter "*.html" | Where-Object { $_.FullName -notmatch '\\node_modules\\' -and $_.FullName -notmatch '\\.git\\' -and $_.FullName -notmatch '\\cdn\\' }
$totalFiles = 0
$totalChanges = 0

$replacements = @(
  # Form actions (unescaped URLs in HTML attributes)
  @('action="https://luonvuituoi.co/', 'action="/'),
  @('action="http://luonvuituoi.co/', 'action="/'),
  @('href="https://luonvuituoi.co/', 'href="/'),
  @('href="http://luonvuituoi.co/', 'href="/'),
  @('src="//luonvuituoi.co/', 'src="/'),
  
  # JSON-LD escaped URLs (the backslash-escaped forward slashes)
  @('"url": "https:\/\/luonvuituoi.co', '"url": "\/'),
  @('"logo": "https:\/\/luonvuituoi.co', '"logo": "\/'),
  @('"target": "https:\/\/luonvuituoi.co', '"target": "\/'),
  
  # Embedded JSON with double-escaped slashes
  @('\/\/luonvuituoi.co\/cdn', '\/cdn'),
  
  # Plain //luonvuituoi.co/ references in attributes
  @('//luonvuituoi.co/', '/')
)

foreach ($file in $htmlFiles) {
  $content = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
  $original = $content
  $fileChanges = 0
  
  foreach ($pair in $replacements) {
    $old = $pair[0]
    $new = $pair[1]
    $count = [regex]::Matches($content, [regex]::Escape($old)).Count
    if ($count -gt 0) {
      $content = $content.Replace($old, $new)
      $fileChanges += $count
    }
  }
  
  if ($fileChanges -gt 0) {
    $totalChanges += $fileChanges
    $totalFiles++
    $relPath = $file.FullName.Replace($baseDir, '')
    Write-Host "$relPath : $fileChanges changes"
    Set-Content -LiteralPath $file.FullName -Value $content -Encoding UTF8 -NoNewline
  }
}

Write-Host "`nDone: $totalFiles files modified, $totalChanges total replacements"
