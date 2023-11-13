const express = require("express");
const path = require("path");
const bodyparser = require("body-parser");

const PORT = process.env.PORT || 8080;
const app = express();



app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json());

app.set("views", __dirname + "/views");
app.set("view engine", "ejs");
app.use(express.static(__dirname + "Assets"));

app.use("/css", express.static(path.resolve(__dirname, "Assets/css")));
app.use("/img", express.static(path.resolve(__dirname, "Assets/img")));
app.use("/js", express.static(path.resolve(__dirname, "Assets/js")));


app.use("/", require("./Server/routes/router"));

var server = app.listen(PORT, () => {

    console.log(`Server is running on http://localhost:${PORT}`);
});

const io = require("socket.io")(server, {
    cors: {
        origin: `http://localhost:${PORT}`,
        methods: ["GET", "POST"],
        transports: ['websocket', 'polling'],
        credentials: true
    },
    allowEI03: true, //False by default
});

var userConnection = [];

io.on("connection", (socket) => {
    console.log("Socket id is: ", socket.id);
    socket.on("userconnect", (data) => {
        console.log("Logged in username", data.displayName);
        userConnection.push({
            connectionId: socket.id,
            user_id: data.displayName,
        });
        var userCount = userConnection.length;
        console.log("UserCount", userCount);
        console.log("UserCount", userCount);


    });

    socket.on("offerSendToRemote", (data) => {
        var offerReceiver = userConnection.find((o) => o.user_id === data.remoteUser);
        if (offerReceiver) {
            console.log("offerReceiver user is :", offerReceiver.connectionId);
            socket.to(offerReceiver.connectionId).emit("ReceiveOffer", data);
        }
    });

    socket.on("answerSentToUser1", (data) => {
        var answerReceiver = userConnection.find((o) => o.user_id === data.receiver);
        if (answerReceiver) {
            console.log("answerReceiver user is :", answerReceiver.connectionId);
            socket.to(answerReceiver.connectionId).emit("ReceiveAnswer", data);
        }

    });

    socket.on("candidateSentToUser", (data) => {
        var candidateReceiver = userConnection.find((o) => o.user_id === data.remoteUser);
        if (candidateReceiver) {
            console.log("Candidate receiver user is :", candidateReceiver.connectionId);
            socket.to(candidateReceiver.connectionId).emit("candidateReceiver", data);
        }
    });



    socket.on("disconnect", () => {
        console.log("User disconnected");
        userConnection = userConnection.filter((p) => p.connectionId !== socket.id);
        console.log("Remaining users:", userConnection.map(user => user.user_id));
    });


});