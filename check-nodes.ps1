# Check if the OpenChain nodes are accessible
# This script tests connectivity to the deployed nodes

# Load node configuration
$config = Get-Content -Path nodes-config.json | ConvertFrom-Json

Write-Host "Checking OpenChain nodes connectivity..."

foreach ($node in $config.nodes) {
    $url = $node.url
    $name = $node.name
    
    try {
        Write-Host "Testing connection to $name at $url..."
        $response = Invoke-WebRequest -Uri "$url/info" -Method GET -TimeoutSec 5 -ErrorAction Stop
        
        if ($response.StatusCode -eq 200) {
            Write-Host "SUCCESS: $name is online and responding with status code $($response.StatusCode)" -ForegroundColor Green
            Write-Host "Response: $($response.Content)"
        } else {
            Write-Host "WARNING: $name responded with unexpected status code $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "ERROR: Failed to connect to $name at $url - $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host "--------------------------------------------------"
}

Write-Host "Node connectivity check completed." 