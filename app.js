// import { initializeApp } from "firebase/app";
// import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
// import { getDatabase, ref, set, onDisconnect, remove, update, onValue, onChildAdded, onChildRemoved } from "firebase/database";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js"
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js"
import { getDatabase, ref, get, set, onDisconnect, remove, update, onValue, onChildAdded, onChildChanged, onChildRemoved } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js"

import { KeyPressListener } from "./KeyPressListener.js"

// Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyChOnH49wZ-M8t0jryC7lEzls0YZ5fBbbA",
  authDomain: "multiplayer-demo-f4f4a.firebaseapp.com",
  databaseURL: "https://multiplayer-demo-f4f4a-default-rtdb.firebaseio.com",
  projectId: "multiplayer-demo-f4f4a",
  storageBucket: "multiplayer-demo-f4f4a.firebasestorage.app",
  messagingSenderId: "428236876036",
  appId: "1:428236876036:web:c4064dbd676c41ead14851"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);




const mapData = {
  minX: 1,
  maxX: 14,
  minY: 4,
  maxY: 12,
  blockedSpaces: {
    "7x4": true,
    "1x11": true,
    "12x10": true,
    "4x7": true,
    "5x7": true,
    "6x7": true,
    "8x6": true,
    "9x6": true,
    "10x6": true,
    "7x9": true,
    "8x9": true,
    "9x9": true,
  },
};

// Options for Player Colors... these are in the same order as our sprite sheet
const playerColors = ["blue", "red", "orange", "yellow", "green", "purple"];

//Misc Helpers
function randomFromArray(array) {
  return array[Math.floor(Math.random() * array.length)];
}
function getCoinKey(x, y) {
  return `${x}x${y}`;
}

function createName() {
  const prefix = randomFromArray([
    "COOL",
    "SUPER",
    "HIP",
    "SMUG",
    "COOL",
    "SILKY",
    "GOOD",
    "SAFE",
    "DEAR",
    "DAMP",
    "WARM",
    "RICH",
    "LONG",
    "DARK",
    "SOFT",
    "BUFF",
    "DOPE",
  ]);
  const animal = randomFromArray([
    "BEAR",
    "DOG",
    "CAT",
    "FOX",
    "LAMB",
    "LION",
    "BOAR",
    "GOAT",
    "VOLE",
    "SEAL",
    "PUMA",
    "MULE",
    "BULL",
    "BIRD",
    "BUG",
  ]);
  return `${prefix} ${animal}`;
}

function isSolid(x,y) {

  const blockedNextSpace = mapData.blockedSpaces[getCoinKey(x, y)];
  return (
    blockedNextSpace ||
    x >= mapData.maxX ||
    x < mapData.minX ||
    y >= mapData.maxY ||
    y < mapData.minY
  )
}

function getRandomSafeSpot() {
  //We don't look things up by key here, so just return an x/y
  return randomFromArray([
    { x: 1, y: 4 },
    { x: 2, y: 4 },
    { x: 1, y: 5 },
    { x: 2, y: 6 },
    { x: 2, y: 8 },
    { x: 2, y: 9 },
    { x: 4, y: 8 },
    { x: 5, y: 5 },
    { x: 5, y: 8 },
    { x: 5, y: 10 },
    { x: 5, y: 11 },
    { x: 11, y: 7 },
    { x: 12, y: 7 },
    { x: 13, y: 7 },
    { x: 13, y: 6 },
    { x: 13, y: 8 },
    { x: 7, y: 6 },
    { x: 7, y: 7 },
    { x: 7, y: 8 },
    { x: 8, y: 8 },
    { x: 10, y: 8 },
    { x: 8, y: 8 },
    { x: 11, y: 4 },
  ]);
}


(function () {

  let thisPlayerId;
  let thisPlayerRef;

  // local data Objects
  let allPlayers = {};
  let allPlayerElements = {};
  let allCoins = {};
  let allCoinElements = {};

  const gameContainer = document.querySelector(".game-container");
  const playerNameInput = document.querySelector("#player-name");
  const playerColorButton = document.querySelector("#player-color");


  function placeCoin() {
    const { x, y } = getRandomSafeSpot();
    const coinRef = ref(getDatabase(), `coins/${getCoinKey(x, y)}`);
    set(coinRef, {
      x,
      y,
    })

    const coinTimeouts = [2000, 3000, 4000, 5000];
    setTimeout(() => {
      placeCoin();
    }, randomFromArray(coinTimeouts));
  }

  function attemptGrabCoin(x, y) {
    const id = getCoinKey(x, y);
    if (allCoins[id]) {
      // Remove this key from data, then uptick Player's coin count
      remove(ref(getDatabase(), `coins/${id}`));
      update(thisPlayerRef, {
        coins: allPlayers[thisPlayerId].coins + 1,
      })
    }
  }

  function handleArrowPress(xChange=0, yChange=0) {
    const newX = allPlayers[thisPlayerId].x + xChange;
    const newY = allPlayers[thisPlayerId].y + yChange;
    if (!isSolid(newX, newY)) {
      //move to the next space
      allPlayers[thisPlayerId].x = newX;
      allPlayers[thisPlayerId].y = newY;
      if (xChange === 1) {
        allPlayers[thisPlayerId].direction = "right";
      }
      if (xChange === -1) {
        allPlayers[thisPlayerId].direction = "left";
      }
      set(thisPlayerRef, allPlayers[thisPlayerId]);
      attemptGrabCoin(newX, newY);
    }
  }

  
  function addPlayerDOM(addedPlayer) {
    const playerElem = document.createElement("div");
    playerElem.classList.add("Character", "grid-cell");
    if (addedPlayer.id === thisPlayerId) {
      playerElem.classList.add("you");
    }
    playerElem.innerHTML = (`
      <div class="Character_shadow grid-cell"></div>
      <div class="Character_sprite grid-cell"></div>
      <div class="Character_name-container">
        <span class="Character_name"></span>
        <span class="Character_coins">0</span>
      </div>
      <div class="Character_you-arrow"></div>
    `);
    
    // Keep a reference for removal later and add to DOM
    allPlayerElements[addedPlayer.id] = playerElem;
    gameContainer.appendChild(playerElem);
  }
  
  function updatePlayerDOM(changedPlayer) {
    const playerElem = allPlayerElements[changedPlayer.id];
    playerElem.querySelector(".Character_name").innerText = changedPlayer.name;
    playerElem.querySelector(".Character_coins").innerText = changedPlayer.coins;
    playerElem.setAttribute("data-color", changedPlayer.color);
    playerElem.setAttribute("data-direction", changedPlayer.direction);
    const left = 16 * changedPlayer.x + "px";
    const top = 16 * changedPlayer.y - 4 + "px";
    playerElem.style.transform = `translate3d(${left}, ${top}, 0)`;
  }

  function deletePlayerDOM(removedPlayer) {
    // updatePlayerDOM(removedPlayer);
    const id = removedPlayer.id;
    gameContainer.removeChild(allPlayerElements[id]);
    delete allPlayerElements[id];
  }

  function addCoinDOM(addedCoin) {
    const coinElement = document.createElement("div");
    coinElement.classList.add("Coin", "grid-cell");
    coinElement.innerHTML = `
      <div class="Coin_shadow grid-cell"></div>
      <div class="Coin_sprite grid-cell"></div>
    `;
    const left = 16 * addedCoin.x + "px";
    const top = 16 * addedCoin.y - 4 + "px";
    coinElement.style.transform = `translate3d(${left}, ${top}, 0)`;

    // Keep a reference for removal later and add to DOM
    const key = getCoinKey(addedCoin.x, addedCoin.y);
    allCoins[key] = true;
    allCoinElements[key] = coinElement;
    gameContainer.appendChild(coinElement);
  }
  
  function deleteCoinDOM(removedCoin) {
    const key = getCoinKey(removedCoin.x, removedCoin.y);
    gameContainer.removeChild(allCoinElements[key]);
    delete allCoinElements[key];
  }

  function initGame() {

    new KeyPressListener("ArrowUp", () => handleArrowPress(0, -1))
    new KeyPressListener("ArrowDown", () => handleArrowPress(0, 1))
    new KeyPressListener("ArrowLeft", () => handleArrowPress(-1, 0))
    new KeyPressListener("ArrowRight", () => handleArrowPress(1, 0))

    // firebase data References
    const allPlayersRef = ref(getDatabase(), `players`);
    const allCoinsRef = ref(getDatabase(), `coins`);

    // Snapshot once when player has joined, and don't call onValue afterwards
    get(allPlayersRef).then((snapshot) => {
      allPlayers = snapshot.val() || {};
    });
    get(allCoinsRef).then((snapshot) => {
      allCoins = snapshot.val() || {};
    });

    // New player has arrived
    onChildAdded(allPlayersRef, (snapshot) => {
      const addedPlayer = snapshot.val();
      addPlayerDOM(addedPlayer);
      updatePlayerDOM(addedPlayer);

      allPlayers[addedPlayer.id] = addedPlayer; // add to data array
    })

    // Player moved
    onChildChanged(allPlayersRef, (snapshot) => {
      const changedPlayer = snapshot.val();
      updatePlayerDOM(changedPlayer);

      allPlayers[changedPlayer.id] = changedPlayer; // modify from data array
    })

    // Player left
    onChildRemoved(allPlayersRef, (snapshot) => {
      const removedPlayer = snapshot.val();
      deletePlayerDOM(removedPlayer);

      delete allPlayers[removedPlayer.id]; // remove from data array
    })

    // Coin added
    onChildAdded(allCoinsRef, (snapshot) => {
      const coin = snapshot.val();
      addCoinDOM(coin);

      const key = getCoinKey(coin.x, coin.y); // add to data array
      allCoins[key] = coin;
    })

    // Coin removed
    onChildRemoved(allCoinsRef, (snapshot) => {
      const coin = snapshot.val();
      deleteCoinDOM(coin);

      const key = getCoinKey(coin.x, coin.y); // remove from data array
      delete allCoins[key];
    })

    // Updates player name with text input
    playerNameInput.addEventListener("change", (e) => {
      const newName = e.target.value || createName();
      playerNameInput.value = newName;
      update(thisPlayerRef, {
        name: newName
      })
    })

    // Update player color on button click
    playerColorButton.addEventListener("click", () => {
      const mySkinIndex = playerColors.indexOf(allPlayers[thisPlayerId].color);
      const nextColor = playerColors[mySkinIndex + 1] || playerColors[0];
      update(thisPlayerRef, {
        color: nextColor
      })
    })

    // Place my first coin
    placeCoin();

  }

  const auth = getAuth(app);
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // You're logged in!
      thisPlayerId = user.uid;
      thisPlayerRef = ref(getDatabase(), `players/${thisPlayerId}`);

      const name = createName();
      playerNameInput.value = name;

      const {x, y} = getRandomSafeSpot();


      set(thisPlayerRef, {
        id: thisPlayerId,
        name: name,
        direction: "right",
        color: randomFromArray(playerColors),
        x: x,
        y: y,
        coins: 0,
      })

      // Remove me from Firebase when I disconnect
      onDisconnect(thisPlayerRef).remove();

      // Begin the game now that we are signed in
      initGame();
    } else {
      // You're logged out.
    }
  })

  signInAnonymously(auth)
    .then(() => {
      // Signed in..
    })
    .catch((error) => {
      var errorCode = error.code;
      var errorMessage = error.message;
      // ...
      console.log(errorCode, errorMessage);
    });


})();
