$endpoint = New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Parse("34.123.3.23"), 51820)
$udpClient = New-Object System.Net.Sockets.UdpClient
$udpClient.Client.ReceiveTimeout = 5000

try {
    $udpClient.Connect($endpoint)
    $bytes = [Text.Encoding]::ASCII.GetBytes("test")
    $udpClient.Send($bytes, $bytes.Length)
    Write-Host "UDP packet sent successfully"
    
    try {
        $receiveBytes = $udpClient.Receive([ref]$endpoint)
        Write-Host "Received response from server"
    } catch [System.Net.Sockets.SocketException] {
        Write-Host "No response received (this is normal for WireGuard)"
    }
} catch {
    Write-Host "Failed to send UDP packet: $_"
} finally {
    $udpClient.Close()
} 