export class WebSocketService {
    private static instance: WebSocketService;
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000; // Start with 1 second delay
    private messageQueue: string[] = [];
    private connecting = false;

    private constructor() {}

    public static getInstance(): WebSocketService {
        if (!WebSocketService.instance) {
            WebSocketService.instance = new WebSocketService();
        }
        return WebSocketService.instance;
    }

    private async connect(): Promise<WebSocket> {
        if (this.ws?.readyState === WebSocket.OPEN) {
            return this.ws;
        }

        if (this.connecting) {
            return new Promise((resolve, reject) => {
                const checkConnection = setInterval(() => {
                    if (this.ws?.readyState === WebSocket.OPEN) {
                        clearInterval(checkConnection);
                        resolve(this.ws);
                    }
                }, 100);

                // Timeout after 5 seconds
                setTimeout(() => {
                    clearInterval(checkConnection);
                    reject(new Error('Connection timeout'));
                }, 5000);
            });
        }

        this.connecting = true;

        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket('ws://localhost:8765');

                this.ws.onopen = () => {
                    console.log('WebSocket connected');
                    this.connecting = false;
                    this.reconnectAttempts = 0;
                    this.reconnectDelay = 1000;
                    
                    // Send any queued messages
                    while (this.messageQueue.length > 0) {
                        const message = this.messageQueue.shift();
                        if (message) this.ws?.send(message);
                    }
                    
                    resolve(this.ws!);
                };

                this.ws.onclose = () => {
                    console.log('WebSocket disconnected');
                    this.connecting = false;
                    this.ws = null;
                    
                    // Attempt to reconnect
                    if (this.reconnectAttempts < this.maxReconnectAttempts) {
                        setTimeout(() => {
                            this.reconnectAttempts++;
                            this.reconnectDelay *= 2; // Exponential backoff
                            this.connect().catch(console.error);
                        }, this.reconnectDelay);
                    }
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    this.connecting = false;
                    reject(error);
                };

            } catch (error) {
                this.connecting = false;
                reject(error);
            }
        });
    }

    public async sendMessage(message: any): Promise<any> {
        try {
            const ws = await this.connect();
            
            return new Promise((resolve, reject) => {
                const messageStr = JSON.stringify(message);
                
                // Set up one-time message handler
                const messageHandler = (event: MessageEvent) => {
                    try {
                        const response = JSON.parse(event.data);
                        ws.removeEventListener('message', messageHandler);
                        
                        if (response.status === 'error') {
                            reject(new Error(response.message));
                        } else {
                            resolve(response);
                        }
                    } catch (error) {
                        reject(error);
                    }
                };
                
                ws.addEventListener('message', messageHandler);
                
                // Send the message or queue it if not connected
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(messageStr);
                } else {
                    this.messageQueue.push(messageStr);
                }
                
                // Timeout after 30 seconds
                setTimeout(() => {
                    ws.removeEventListener('message', messageHandler);
                    reject(new Error('Request timeout'));
                }, 30000);
            });
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(`Failed to send WebSocket message: ${errorMessage}`);
        }
    }

    public async activateVPN(config: string, filename: string): Promise<void> {
        const message = {
            command: 'connect',
            config,
            filename
        };
        
        await this.sendMessage(message);
    }

    public async deactivateVPN(): Promise<void> {
        const message = {
            command: 'disconnect'
        };
        
        await this.sendMessage(message);
    }
}

export const webSocketService = WebSocketService.getInstance(); 