$ErrorActionPreference = 'Stop'
$origin = 'https://ieum-v2-react.vercel.app/'
$destination = Join-Path $PSScriptRoot 'ieum-v2-download'
New-Item -ItemType Directory -Force -Path $destination | Out-Null
$queue = [Collections.Generic.Queue[string]]::new()
$seen = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
$records = [Collections.Generic.List[object]]::new()
$failures = [Collections.Generic.List[object]]::new()
$queue.Enqueue('index.html')
$pattern = @'
["'`](/[^"'`\s<>]+\.(?:wav|mp3|ogg|m4a|mp4|webm|png|jpe?g|gif|webp|svg|ico|ttf|woff2?|otf|json|webmanifest|pdf|zip|js|css|map)(?:\?[^"'`\s<>]*)?)["'`]|url\(\s*["']?([^\s)"']+)["']?\s*\)
'@
while ($queue.Count -gt 0) {
    $relative = $queue.Dequeue()
    if (-not $seen.Add($relative)) { continue }
    $url = if ($relative -eq 'index.html') { $origin } else { $origin + $relative }
    $output = Join-Path $destination ($relative -replace '\?.*$', '')
    $resolved = [IO.Path]::GetFullPath($output)
    if (-not $resolved.StartsWith(([IO.Path]::GetFullPath($destination) + [IO.Path]::DirectorySeparatorChar), [StringComparison]::OrdinalIgnoreCase)) {
        throw "Unsafe output path: $relative"
    }
    New-Item -ItemType Directory -Force -Path (Split-Path $output) | Out-Null
    try {
        if (Test-Path -LiteralPath $output) {
            $status = 200
            $contentType = 'previously-downloaded-and-verified'
        } else {
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -OutFile $output -PassThru
            $status = [int]$response.StatusCode
            $contentType = $response.Headers['Content-Type'] -join '; '
            if ($relative -ne 'index.html' -and $contentType -match 'text/html') {
                throw 'Server returned HTML in place of the requested asset.'
            }
        }
        $file = Get-Item -LiteralPath $output
        if ($file.Length -eq 0) { throw 'Downloaded file is empty.' }
        $records.Add([pscustomobject]@{
            path = $relative
            url = $url
            bytes = $file.Length
            status = $status
            contentType = $contentType
            sha256 = (Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash.ToLowerInvariant()
        })
        if ($file.Extension -in @('.html', '.js', '.css', '.json', '.webmanifest', '.svg')) {
            $source = [IO.File]::ReadAllText($output)
            foreach ($match in [regex]::Matches($source, $pattern.Trim())) {
                $reference = if ($match.Groups[1].Success) { $match.Groups[1].Value } else { $match.Groups[2].Value }
                if ($reference -match '^(data:|blob:|#)' -or $reference.Contains('${')) { continue }
                $assetUri = [uri]::new([uri]$url, $reference)
                if ($assetUri.Host -eq ([uri]$origin).Host) {
                    $queue.Enqueue($assetUri.PathAndQuery.TrimStart('/'))
                }
            }
        }
        Write-Output "Saved $relative ($($file.Length) bytes)"
    } catch {
        $failures.Add([pscustomobject]@{ path = $relative; url = $url; error = $_.Exception.Message })
        Write-Warning "Failed $relative : $($_.Exception.Message)"
    }
}
$manifest = [pscustomobject]@{
    source = $origin
    downloadedAt = [DateTimeOffset]::UtcNow.ToOffset([TimeSpan]::FromHours(9)).ToString('o')
    scope = 'Public deployment files referenced by HTML, JavaScript, CSS, manifests and SVGs. Inline resources and application data remain embedded in their original files.'
    count = $records.Count
    totalBytes = ($records | Measure-Object -Property bytes -Sum).Sum
    files = @($records.ToArray() | Sort-Object path)
    failures = @($failures.ToArray())
}
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $destination 'download-manifest.json') -Encoding utf8
Write-Output ($manifest | Select-Object count, totalBytes, failures | ConvertTo-Json -Depth 4)
if ($failures.Count -gt 0) { exit 1 }
