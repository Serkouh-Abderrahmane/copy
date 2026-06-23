function Fix-HtmlFile {
    param(
        [string]$FilePath,
        [string]$CdnPrefix
    )

    Write-Host "Processing: $FilePath"

    $content = Get-Content -Path $FilePath -Raw -Encoding UTF8
    $originalLength = $content.Length

    # Remove preconnect links to external domains
    $content = $content -replace '<link rel="preconnect" href="https://fonts\.shopifycdn\.com/?"[^>]*>', ''
    $content = $content -replace '<link rel="preconnect" href="https://cdn\.shopify\.com/?"[^>]*>', ''

    # Remove Klip app extension (script + CSS)
    $content = $content -replace '<script[^>]*src="[^"]*klip-app\.js"[^>]*></script>', ''
    $content = $content -replace '<link[^>]*href="[^"]*klip-app\.css"[^>]*>', ''

    # Remove Monorail DNS prefetch
    $content = $content -replace '<link href="https://monorail-edge\.shopifysvc\.com/?"[^>]*>', ''

    # Remove monorail abandonment sendBeacon script (single line minified)
    $content = $content -replace '<script>\(function\(\).*?monorail-edge\.shopifysvc\.com.*?</script>', ''

    # Remove Trekkie shim (multiline)
    $content = $content -replace '<script>[\s\S]*?window\.__TREKKIE_SHIM_QUEUE[\s\S]*?</script>', ''

    # Remove web-pixels-manager-setup (single line minified)
    $content = $content -replace '<script id="web-pixels-manager-setup">.*?</script>', ''

    # Remove analytics class script (big trekkie loader - multiline)
    $content = $content -replace '<script class="analytics">[\s\S]*?</script>', ''

    # Remove ShopifyAnalytics meta script (that doesn't have src)
    $content = $content -replace '<script>\s*window\.ShopifyAnalytics\s*=\s*window\.ShopifyAnalytics[\s\S]*?</script>', ''

    # Remove external shop-js loader
    $content = $content -replace '<script[^>]*src="[^"]*cdn\.shopify\.com/shopifycloud/shop-js[^"]*"[^>]*>', ''

    # Remove facebook pixel script
    $content = $content -replace '<script[^>]*src="[^"]*facebook-pixel\.js"[^>]*>', ''

    # Remove standard-actions script
    $content = $content -replace '<script[^>]*src="[^"]*standard-actions\.js"[^>]*>', ''

    # Remove perf-kit script (multiline)
    $content = $content -replace '<script[^>]*src="[^"]*shopify-perf-kit[^"]*"[^>]*>[\s\S]*?</script>', ''

    # Remove shop_events_listener script
    $content = $content -replace '<script[^>]*src="[^"]*shop_events_listener[^"]*"[^>]*>', ''

    # Remove trekkie.storefront script
    $content = $content -replace '<script[^>]*src="[^"]*trekkie\.storefront[^"]*"[^>]*>', ''

    # Remove data-* attributes for monorail/rendering
    $content = $content -replace 'data-monorail-region="[^"]*"', ''
    $content = $content -replace 'data-render-region="[^"]*"', ''
    $content = $content -replace 'data-application="storefront-renderer"', ''

    # ============================================================
    # URL replacements
    # ============================================================
    if ($CdnPrefix -eq "") {
        # Root-level files: //luonvuituoi.co/cdn/ -> cdn/
        $content = $content -replace '//luonvuituoi\.co/cdn/', 'cdn/'
        $content = $content -replace 'https://luonvuituoi\.co/cdn/', 'cdn/'
        $content = $content -replace 'http://luonvuituoi\.co/cdn/', 'cdn/'
        # Fix ../cdn.shopify.com/ -> remove
        $content = $content -replace '(\.\./)+cdn\.shopify\.com/', ''
        # Fix https://cdn.shopify.com/extensions/ -> remove (they don't exist locally)
        $content = $content -replace 'https://cdn\.shopify\.com/extensions/\S+', ''
        # Fix https://luonvuituoi.co/api/ -> remove
        $content = $content -replace 'https://luonvuituoi\.co/api/\S+', ''
        # Fix https://luonvuituoi.co/404 -> POST.html
        $content = $content -replace 'https://luonvuituoi\.co/404', 'POST.html'
    } else {
        # Subdirectory files: //luonvuituoi.co/cdn/ -> ../cdn/
        $content = $content -replace '//luonvuituoi\.co/cdn/', ($CdnPrefix + 'cdn/')
        $content = $content -replace 'https://luonvuituoi\.co/cdn/', ($CdnPrefix + 'cdn/')
        $content = $content -replace 'http://luonvuituoi\.co/cdn/', ($CdnPrefix + 'cdn/')
        # Fix ../../cdn.shopify.com/ -> remove
        $content = $content -replace '(\.\./)+cdn\.shopify\.com/', ''
        # Fix https://cdn.shopify.com/extensions/ -> remove
        $content = $content -replace 'https://cdn\.shopify\.com/extensions/\S+', ''
        # Fix https://luonvuituoi.co/api/ -> remove
        $content = $content -replace 'https://luonvuituoi\.co/api/\S+', ''
        # Fix https://luonvuituoi.co/404 -> ../POST.html
        $content = $content -replace 'https://luonvuituoi\.co/404', ($CdnPrefix + 'POST.html')
    }

    # Fix canonical links - replace https://luonvuituoi.co/... with relative
    $content = $content -replace 'href="https://luonvuituoi\.co/([^"]+)"', 'href="$1"'
    # Fix og:url
    $content = $content -replace 'property="og:url"[^>]*content="https://luonvuituoi\.co[^"]*"', 'property="og:url" content="index.html"'

    # Cleanup extra blank lines
    $content = $content -replace "`n`n`n+", "`n`n"

    if ($content.Length -ne $originalLength) {
        Write-Host "  -> Changes made ($($originalLength - $content.Length) bytes removed)"
    } else {
        Write-Host "  -> No changes"
    }

    [System.IO.File]::WriteAllText($FilePath, $content, [System.Text.UTF8Encoding]::new($false))
}


# === MAIN ===
$baseDir = "C:\Users\laptop 368\Desktop\my computer\code\websites\luonvuituoi.co"

Write-Host "=== Processing ROOT HTML files ==="
$rootFiles = @("$baseDir\index.html", "$baseDir\cart.html", "$baseDir\POST.html")
foreach ($file in $rootFiles) {
    if (Test-Path $file) {
        Fix-HtmlFile -FilePath $file -CdnPrefix ""
    }
}

Write-Host "=== Processing collections/ ==="
Get-ChildItem "$baseDir\collections" -Filter "*.html" | ForEach-Object {
    Fix-HtmlFile -FilePath $_.FullName -CdnPrefix "../"
}

Write-Host "=== Processing products/ ==="
Get-ChildItem "$baseDir\products" -Filter "*.html" | Where-Object {
    $_.Name -notlike "*.tmp" -and $_.Name -notlike "*.z" -and $_.Name -notlike "*.oembed"
} | ForEach-Object {
    Fix-HtmlFile -FilePath $_.FullName -CdnPrefix "../"
}

Write-Host "=== Processing pages/ ==="
Get-ChildItem "$baseDir\pages" -Filter "*.html" | Where-Object { $_.Name -notlike "*.tmp" } | ForEach-Object {
    Fix-HtmlFile -FilePath $_.FullName -CdnPrefix "../"
}

Write-Host "=== Processing account/ ==="
Get-ChildItem "$baseDir\account" -Filter "*.html" | ForEach-Object {
    Fix-HtmlFile -FilePath $_.FullName -CdnPrefix "../"
}

Write-Host "=== DONE ==="
