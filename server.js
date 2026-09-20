const express = require("express");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

const serversFolder = path.join(__dirname, "servers");

if (!fs.existsSync(serversFolder)) {
    fs.mkdirSync(serversFolder);
}

const runningServers = {};


// ===============================
// GET SERVERS
// ===============================

app.get("/api/servers", (req, res) => {

    const servers = fs.readdirSync(serversFolder);

    const result = servers.map(name => ({
        name: name,
        online: !!runningServers[name]
    }));

    res.json(result);
});


// ===============================
// CREATE SERVER
// ===============================

app.post("/api/create", (req, res) => {

    const name = req.body.name;

    if (!name) {
        return res.status(400).json({
            error: "Server name is required"
        });
    }

    // Prevent dangerous folder names
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
        return res.status(400).json({
            error: "Invalid server name"
        });
    }

    const serverPath = path.join(serversFolder, name);

    if (fs.existsSync(serverPath)) {
        return res.status(400).json({
            error: "Server already exists"
        });
    }

    fs.mkdirSync(serverPath);

    res.json({
        success: true,
        message: `Server ${name} created`
    });
});


// ===============================
// START SERVER
// ===============================

app.post("/api/start", (req, res) => {

    const name = req.body.name;

    if (!name) {
        return res.status(400).json({
            error: "Server name required"
        });
    }

    if (runningServers[name]) {
        return res.json({
            error: "Server already running"
        });
    }

    const serverPath = path.join(serversFolder, name);

    if (!fs.existsSync(serverPath)) {
        return res.status(404).json({
            error: "Server not found"
        });
    }

    /*
      IMPORTANT:

      Put server.jar inside:

      servers/YOUR_SERVER/server.jar
    */

    const jar = path.join(serverPath, "server.jar");

    if (!fs.existsSync(jar)) {
        return res.status(400).json({
            error: "Minecraft server.jar not found"
        });
    }

    const minecraft = spawn(
        "java",
        [
            "-Xms512M",
            "-Xmx1G",
            "-jar",
            "server.jar",
            "nogui"
        ],
        {
            cwd: serverPath
        }
    );

    runningServers[name] = minecraft;

    minecraft.stdout.on("data", data => {
        console.log(`[${name}] ${data}`);
    });

    minecraft.stderr.on("data", data => {
        console.error(`[${name}] ${data}`);
    });

    minecraft.on("close", () => {

        console.log(`${name} stopped`);

        delete runningServers[name];

    });

    res.json({
        success: true,
        message: `${name} started`
    });
});


// ===============================
// STOP SERVER
// ===============================

app.post("/api/stop", (req, res) => {

    const name = req.body.name;

    const minecraft = runningServers[name];

    if (!minecraft) {
        return res.json({
            error: "Server is not running"
        });
    }

    minecraft.stdin.write("stop\n");

    res.json({
        success: true,
        message: `${name} stopping`
    });
});


// ===============================
// SERVER STATUS
// ===============================

app.get("/api/status/:name", (req, res) => {

    const name = req.params.name;

    res.json({
        name: name,
        online: !!runningServers[name]
    });
});


// ===============================
// START WEBSITE
// ===============================

app.listen(PORT, () => {

    console.log("");
    console.log("================================");
    console.log("       MD SERVERS ONLINE");
    console.log("================================");
    console.log("");
    console.log(`Website: http://localhost:${PORT}`);
    console.log("");

});
