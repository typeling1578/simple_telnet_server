import net from "net";
import fs from "fs";
import { RateLimiterMemory } from "rate-limiter-flexible";

const rateLimiter = new RateLimiterMemory({
    points: 1000,
    duration: 1,
});

async function executeRateLimiter(socket, point = 1) {
    const clientInfo = `${socket.remoteAddress}:${socket.remotePort}`;

    try {
        await rateLimiter.consume(socket.remoteAddress, point);
    } catch (e) {
        console.log(`rate limited, client = ${clientInfo}`);
        socket.destroy();
    }
}

const server = net.createServer(async socket => {
    const clientInfo = `${socket.remoteAddress}:${socket.remotePort}`;

    console.log(`connected, client = ${clientInfo}`);

    socket.on("close", () => {
        console.log(`closed, client = ${clientInfo}`);
    });

    socket.on("error", e => {
        console.error(e);
    });

    await executeRateLimiter(socket, 100);

    socket.on("data", async data => {
        await executeRateLimiter(socket, data.length);
        console.log(`'${data}', client = ${clientInfo}`);
    });

    const message = fs.readFileSync("./message.txt").toString();
    for (let char of message.split("")) {
        if (!socket.write(char)) break;
        await new Promise(resolve => setTimeout(resolve, char == " " ? 10 : 30));
    }
}).listen(23);

console.log('listening on port 23');
