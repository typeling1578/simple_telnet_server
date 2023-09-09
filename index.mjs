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

const server = net.createServer(socket => {
    const clientInfo = `${socket.remoteAddress}:${socket.remotePort}`;

    console.log(`connected (${server.connections}/${server.maxConnections}), client = ${clientInfo}`);

    socket.on("close", () => {
        console.log(`closed (${server.connections}/${server.maxConnections}), client = ${clientInfo}`);
    });

    socket.on("error", e => {
        console.error(e);
    });

    (async () => {
        await executeRateLimiter(socket, 100);

        socket.on("data", async data => {
            await executeRateLimiter(socket, data.length);
            console.log(`'${data}', client = ${clientInfo}`);
        });

        const message = fs.readFileSync("./message.txt").toString();
        for (let char of message.split("")) {
            if (!socket.writable) break;
            await new Promise(resolve => socket.write(char, "utf-8", e => {
                if (e) {
                    console.error(e);
                }
                resolve();
            }));
            await new Promise(resolve => setTimeout(resolve, char == " " ? 10 : 30));
        }
    })();
});
server.maxConnections = 100;
server.listen(23);

console.log("listening on port 23");
