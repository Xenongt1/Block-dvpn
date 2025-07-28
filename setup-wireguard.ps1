# Must be run as Administrator
$ErrorActionPreference = "Stop"

# Configuration
$configContent = @"
[Interface]
PrivateKey = EAjgBJlCMU1Xbc+qsA9By6EM2V/J9qlbUZniF4yFXFM=
Address = 10.0.0.2/24
DNS = 1.1.1.1

[Peer]
PublicKey = dqKS2PAxxb2X1vzr0AMaMiIaBjnwmMSteT9uOZvLKxs=
AllowedIPs = 0.0.0.0/0
Endpoint = 34.89.26.3:51820
PersistentKeepalive = 25
"@

# Save the configuration
$configPath = "$env:ProgramFiles\WireGuard\Data\Configurations\wg0-client.conf"
New-Item -ItemType Directory -Force -Path (Split-Path $configPath)
Set-Content -Path $configPath -Value $configContent

Write-Host "Configuration saved to: $configPath"
Write-Host "To activate: Open WireGuard and click 'Activate' on the imported tunnel" 