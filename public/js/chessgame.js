const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");
const whiteCapturedElement = document.querySelector(".white-captured");
const blackCapturedElement = document.querySelector(".black-captured");
const gameMessageElement = document.querySelector(".game-message");
const whitePlayerNameElement = document.querySelector(".white-player-name");
const blackPlayerNameElement = document.querySelector(".black-player-name");
const gameContainer = document.querySelector(".game-container");


let playerRole = null;
let playerName = null;
let opponentName = null;
let selectedSquare = null; 
let capturedPieces = { w: [], b: [] }; 
let validMoves = []; 
let isVsComputer = false; 

const startGame = () => {
    selectionContainer.classList.add("hidden");
    gameContainer.classList.remove("hidden");

    if (isVsComputer) {
        whitePlayerNameElement.textContent = "Player";
        blackPlayerNameElement.textContent = "Computer";
    } else {
        socket.emit("joinGame");
    }
};

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = "";
    board.forEach((row, rowindex) => {
        row.forEach((square, squareindex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add(
                "square",
                (rowindex + squareindex) % 2 === 0 ? "Light" : "dark"
            );
            squareElement.dataset.row = rowindex;
            squareElement.dataset.col = squareindex;

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add(
                    "piece",
                    square.color === "w" ? "white" : "black"
                );
                pieceElement.innerHTML = getPieceUnicode(square.type, square.color);
                squareElement.appendChild(pieceElement);
                if (playerRole === square.color) {
                    pieceElement.addEventListener("click", () => {
                        highlightMoves(rowindex, squareindex);
                    });
                }
            }

            squareElement.addEventListener("click", () => {
                if (selectedSquare) {
                    const targetSource = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col),
                    };
                    handleMove(selectedSquare, targetSource);
                }
            });

            boardElement.appendChild(squareElement);
        });
    });

    if (playerRole === "b") {
        boardElement.classList.add("flipped");
    } else {
        boardElement.classList.remove("flipped");
    }
};

const highlightMoves = (row, col) => {
    document.querySelectorAll(".square").forEach((square) => {
        square.classList.remove("highlight");
    });

    const squareName = `${String.fromCharCode(97 + col)}${8 - row}`;
    const moves = chess.moves({ square: squareName, verbose: true });

    selectedSquare = { row, col };
    const selectedSquareElement = document.querySelector(
        `.square[data-row="${row}"][data-col="${col}"]`
    );
    selectedSquareElement.classList.add("highlight");

    validMoves = moves.map((move) => {
        const targetRow = 8 - parseInt(move.to[1]);
        const targetCol = move.to.charCodeAt(0) - 97;
        const targetSquareElement = document.querySelector(
            `.square[data-row="${targetRow}"][data-col="${targetCol}"]`
        );
        targetSquareElement.classList.add("highlight");
        return { row: targetRow, col: targetCol };
    });
};
const handleMove = (source, target) => {

    const isValidMove = validMoves.some(
        (move) => move.row === target.row && move.col === target.col
    );

    if (!isValidMove) {
        console.log("Invalid move:", target);
        return; 
    }

    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: "q",
    };

    const result = chess.move(move); 
    if (result) {
        if (result.captured) {
            capturedPieces[result.color === "w" ? "b" : "w"].push(result.captured);
        }

        animatePieceMovement(source, target);

        renderCapturedPieces(); 
        checkGameState(); 

        if (isVsComputer && chess.turn() === "b") {
            setTimeout(makeComputerMove, 500); 
        } else {
            socket.emit("move", move);
        }
    } else {
        console.log("Invalid move:", move);
    }

    resetPlayerState();
};



const resetPlayerState = () => {

    document.querySelectorAll(".square").forEach((square) => {
        square.classList.remove("highlight");
    });
    selectedSquare = null;
    validMoves = []; 
};
const animatePieceMovement = (source, target) => {
    const sourceSquareElement = document.querySelector(
        `.square[data-row="${source.row}"][data-col="${source.col}"] .piece`
    );
    const targetSquareElement = document.querySelector(
        `.square[data-row="${target.row}"][data-col="${target.col}"]`
    );

    if (sourceSquareElement && targetSquareElement) {
 
        const sourceRect = sourceSquareElement.parentElement.getBoundingClientRect();
        const targetRect = targetSquareElement.getBoundingClientRect();
        const deltaX = targetRect.left - sourceRect.left;
        const deltaY = targetRect.top - sourceRect.top;

        sourceSquareElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

        setTimeout(() => {
            sourceSquareElement.style.transform = ""; 
            targetSquareElement.appendChild(sourceSquareElement); 
        }, 500); 
    }
};

const renderCapturedPieces = () => {
    whiteCapturedElement.innerHTML = "";
    blackCapturedElement.innerHTML = "";

    capturedPieces.w.forEach((piece) => {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add("piece", "white");
        pieceElement.innerHTML = getPieceUnicode(piece, "w");
        whiteCapturedElement.appendChild(pieceElement);
    });

    capturedPieces.b.forEach((piece) => {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add("piece", "black");
        pieceElement.innerHTML = getPieceUnicode(piece, "b");
        blackCapturedElement.appendChild(pieceElement);
    });
};

const checkGameState = () => {

    document.querySelectorAll(".square").forEach((square) => {
        square.classList.remove("king-in-check");
    });

    if (chess.in_checkmate()) {
        highlightKingInCheck();
        showGameMessage("Checkmate! Game Over!");
        return; 
    }

    if (chess.in_check()) {
        highlightKingInCheck();
        showGameMessage("Check!"); 
    } else {
        hideGameMessage(); 
    }
};

const highlightKingInCheck = () => {
    const board = chess.board();
    let kingRow = null;
    let kingCol = null;

    board.forEach((row, rowIndex) => {
        row.forEach((square, colIndex) => {
            if (square && square.type === "k" && square.color === chess.turn()) {
                kingRow = rowIndex;
                kingCol = colIndex;
            }
        });
    });

    if (kingRow !== null && kingCol !== null) {
        const kingSquareElement = document.querySelector(
            `.square[data-row="${kingRow}"][data-col="${kingCol}"]`
        );

        if (kingSquareElement) {
            kingSquareElement.classList.add("king-in-check");
        }
    }
};

const showGameMessage = (message) => {
    gameMessageElement.textContent = message;
    gameMessageElement.classList.remove("hidden");
};

const hideGameMessage = () => {
    gameMessageElement.classList.add("hidden");
};

const getPieceUnicode = (type, color) => {
    const pieces = {
        p: { w: "♙", b: "♟" },
        r: { w: "♖", b: "♜" },
        n: { w: "♘", b: "♞" },
        b: { w: "♗", b: "♝" },
        q: { w: "♕", b: "♛" },
        k: { w: "♔", b: "♚" },
    };
    return pieces[type][color];
};
socket.on("playerRole", function (role) {
    playerRole = role;
    if (role === "w") {
        whitePlayerNameElement.textContent = playerName;
    } else if (role === "b") {
        blackPlayerNameElement.textContent = playerName;
    }
    renderBoard();
});
socket.on("opponentName", function (name) {
    opponentName = name;
    if (playerRole === "w") {
        blackPlayerNameElement.textContent = name;
    } else if (playerRole === "b") {
        whitePlayerNameElement.textContent = name;
    }
});

socket.on("boardState", function (fen) {
    chess.load(fen);
    renderBoard();
    renderCapturedPieces();
    checkGameState();
});

socket.on("move", (move) => {
    const result = chess.move(move); 
    if (result) {
        if (result.captured) {
            capturedPieces[result.color === "w" ? "b" : "w"].push(result.captured);
        }

        const source = {
            row: 8 - parseInt(move.from[1]),
            col: move.from.charCodeAt(0) - 97,
        };
        const target = {
            row: 8 - parseInt(move.to[1]),
            col: move.to.charCodeAt(0) - 97,
        };
        animatePieceMovement(source, target);

        renderCapturedPieces(); 
        checkGameState(); 
    }
});

renderBoard();