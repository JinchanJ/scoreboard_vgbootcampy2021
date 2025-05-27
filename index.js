const ROTATION_INTERVAL = 10000;

const overlayState = {
  matchModeIndex: 0,
  matchDisplayModes: ["match", "best_of_text"],
  displayModes: ["twitter", "pronoun"],
  currentPlayerModeIndex: 0,
  firstTime: true,
  intervalID: "",
  lastDisplayedPlayerHash: "",
  savedMatchDisplayHash: ""
}

LoadEverything().then(() => {

  Update = async (event) => {
    console.log("Update triggered", { event });
    const { data: newData } = event;
    overlayState.data = newData;

    const score = overlayState.data.score[window.scoreboardNumber];
    const team1 = score.team["1"];
    const team2 = score.team["2"];
    overlayState.team1Losers = team1.losers;
    overlayState.team2Losers = team2.losers;
    overlayState.bothLosers = overlayState.team1Losers && overlayState.team2Losers;
    overlayState.neitherLoser = !overlayState.team1Losers && !overlayState.team2Losers;

    // Store winners
    if (!overlayState.bothLosers && !overlayState.neitherLoser) {
      if (Object.keys(team1.player).length === 1) {
        const winnerPlayer = !overlayState.team1Losers ? team1.player["1"] : team2.player["1"];
        if (winnerPlayer?.name) {
          localStorage.setItem("playerInWinners", JSON.stringify({ name: winnerPlayer.name }));
        }
      } else {
        const winnerTeam = !overlayState.team1Losers ? team1.teamName : team2.teamName;
        localStorage.setItem("teamNameInWinners", winnerTeam);
      }
    }

    const team1Player = team1.player["1"] || {};
    const team2Player = team2.player["1"] || {};
    const matchDisplayMap = getMatchDisplayFieldMap(score || {});
    const validMatchModes = overlayState.matchDisplayModes.filter(mode => matchDisplayMap[mode]);

    const player1Fields = getPlayerDisplayFieldMap(team1Player);
    const player2Fields = getPlayerDisplayFieldMap(team2Player);

    const validModes = getAvailableDisplayModes(team1Player, team2Player, overlayState.displayModes);

    // Ensure current index is still valid
    if (!validModes.includes(validModes[overlayState.currentPlayerModeIndex % validModes.length])) {
      overlayState.currentPlayerModeIndex = 0;
    }

    // Recompute updated mode after index reset
    
    const hasPlayer1Info = overlayState.displayModes.some(mode => player1Fields[mode]);
    const hasPlayer2Info = overlayState.displayModes.some(mode => player2Fields[mode]);

    const p1Container = document.querySelector(".p1.twitter_container");
    const p2Container = document.querySelector(".p2.twitter_container");

    // Display player or team names and scores
    forEachTeamPlayer(newData, async (team, t, player) => {
      const playerCount = Object.keys(team.player).length;
      if (playerCount === 1) {
        await DisplayEntityName(t, player);
      } else {
        const names = await Promise.all(
          Object.values(team.player).map(p => Transcript(p.name))
        );
        const teamName = team.teamName || names.join(" / ");
        await DisplayEntityName(t, teamName, true);
      }
      SetInnerHtml($(`.p${t + 1} .score`), String(team.score ?? 0));

      if (team.color) {
        document.documentElement.style.setProperty(`--p${t + 1}-score-bg-color`, team.color);
      }

      const flagContainer = $(`.p${t + 1}.container .flagcountry`);
      const showFlag = player.country && player.country.asset && playerCount === 1;
      const flagHtml = showFlag
        ? `<div class='flag' style="background-image: url('https://gepi.global-e.com/content/images/flags/${player.country.code.toLowerCase()}.png')"></div>`
        : "";
      SetInnerHtml(flagContainer, flagHtml);
    });

    let twitterChanged = false;
    let matchChanged = false;

    const updatedCurrentMode = validModes[overlayState.currentPlayerModeIndex % validModes.length] ?? "";
    const newTwitterHash = [player1Fields[updatedCurrentMode], player2Fields[updatedCurrentMode]].join("||");
    const oldTwitterHash = overlayState.lastDisplayedPlayerHash || "";

    twitterChanged = newTwitterHash !== oldTwitterHash;
    overlayState.lastDisplayedPlayerHash = newTwitterHash;
    const matchDisplayFieldMap = getMatchDisplayFieldMap(score);

    const matchDisplayValues = overlayState.matchDisplayModes
      .map(mode => matchDisplayFieldMap[mode] ?? "")
      .filter(Boolean);

    const currentHash = matchDisplayValues.join("||");
    matchChanged = currentHash !== overlayState.savedMatchDisplayHash;

    if (twitterChanged || matchChanged) {
      await window.UpdateTwitterMatch();
      window.resetIntervals();
    }

    if (overlayState.firstTime) {
      if (!hasPlayer1Info) p1Container.style.display = "none";
      else p1Container.style.display = "";

      if (!hasPlayer2Info) p2Container.style.display = "none";
      else p2Container.style.display = "";

      const startingAnimation = gsap.timeline({ paused: false })
        .from([".logo"], { duration: 0.5, autoAlpha: 0, ease: "power2.inOut" })
        .from([".anim_container_outer"], { duration: 1, width: "162px", ease: "power2.inOut" });

      console.log("HELLO!");

      if (hasPlayer1Info) {
        startingAnimation.from([".p1.twitter_container"], {
          duration: 1,
          opacity: 0,
          x: "-373px",
          ease: "power2.inOut"
        }, "<");
      }

      if (hasPlayer2Info) {
        startingAnimation.from([".p2.twitter_container"], {
          duration: 1,
          opacity: 0,
          x: "373px",
          ease: "power2.inOut"
        }, "<");
      }

      if (validMatchModes.length > 0) {
        startingAnimation.from(".tournament_container", {
          opacity: 0,
          duration: 0.5,
          ease: "power4.Out"
        });
      }

      window.resetIntervals();
      overlayState.firstTime = false;
    }
  };
});

function getMatchDisplayFieldMap(score) {
  return {
    "match": score.match,
    "best_of_text": score.best_of_text
  };
}

function getPlayerDisplayFieldMap(player) {
  return {
    "twitter": player.twitter
      ? `<span class="twitter_logo"></span>@${player.twitter}`
      : "",
    "pronoun": player.pronoun
      ? player.pronoun.toUpperCase()
      : ""
  };
}

const setName = async (selector, team, name, suffix = "") => {
  SetInnerHtml($(selector), `
    <span>
      <span class="sponsor">${team ? team.replace(/\s*[\|\/\\]\s*/g, ' ') : ""}</span>
      ${name ? await Transcript(name) : ""} ${suffix}
    </span>
  `);
};

function forEachTeamPlayer(data, callback) {
  ["1", "2"].forEach((num, t) => {
    const team = data.score[window.scoreboardNumber].team[num];
    Object.values(team.player).forEach((player, p) => {
      if (player) callback(team, t, player, p);
    });
  });
}

// Enhanced toggleVisibility to control display as well as opacity
const toggleVisibility = (el, visible) => {
  if (!el) return;

  if (overlayState.firstTime) {
    el.style.display = visible ? "" : "none";
    return;
  }

  if (visible) {
    el.style.display = "";
    gsap.to(el, { duration: 0.5, opacity: 1 });
  } else {
    gsap.to(el, {
      duration: 0.5,
      opacity: 0,
      onComplete: () => {
        el.style.display = "none";
      }
    });
  }
};

const formatPlayerOverlayContent = (player) => {
  const player1 = overlayState.data.score[window.scoreboardNumber].team["1"].player["1"];
  const player2 = overlayState.data.score[window.scoreboardNumber].team["2"].player["1"];
  const allModes = overlayState.displayModes;
  const validModes = getAvailableDisplayModes(player1, player2, allModes);
  const playerFields = getPlayerDisplayFieldMap(player);

  // If no valid modes, show nothing
  if (validModes.length === 0) return "";

  // Pick the current valid mode based on rotation index
  const mode = validModes[overlayState.currentPlayerModeIndex % validModes.length];

  // Only return if player has that field
  return playerFields[mode] || "";
};

const compareObjects = (obj1, obj2) => {
  const keys = Object.keys(obj1).sort();
  for (const key of keys) {
    if (["character", "mains", "id", "mergedName", "mergedOnlyName", "seed", ""].includes(key)) continue;
    if (!(key in obj2)) return false;
    const val1 = obj1[key], val2 = obj2[key];
    if (typeof val1 === 'object' && val1 && val2) {
      if (!compareObjects(val1, val2)) return false;
    } else if (val1 !== val2) return false;
  }
  return true;
};

Start = async () => {
  console.log("window.Start() was called");
  startingAnimation.restart();
  window.resetIntervals();
};

function getAvailableDisplayModes(player1, player2, allModes) {
  return allModes.filter(mode => {
    const f1 = getPlayerDisplayFieldMap(player1)[mode];
    const f2 = getPlayerDisplayFieldMap(player2)[mode];
    return f1 || f2;
  });
}

window.UpdateMatch = async () => {
  const score = overlayState.data.score[window.scoreboardNumber];
  const container = document.querySelector(".tournament_container");
  toggleVisibility(container, !!(score.best_of || score.match));

  const matchDisplayFieldMap = getMatchDisplayFieldMap(score);
  const validMatchModes = overlayState.matchDisplayModes.filter(mode => matchDisplayFieldMap[mode]);
  const displayText = matchDisplayFieldMap[validMatchModes[overlayState.matchModeIndex % validMatchModes.length]] ?? "";

  SetInnerHtml($(".match"), displayText);
  overlayState.savedMatchDisplayHash = validMatchModes.map(mode => matchDisplayFieldMap[mode]).join("||");
};

window.UpdateTwitter = async () => {
  forEachTeamPlayer(overlayState.data, (team, t, player) => {
    const twitterContainer = document.querySelector(`.p${t + 1}.twitter_container`);
    const isSolo = Object.values(team.player).length === 1;
    const visible = (player.twitter || player.pronoun) && isSolo;

    toggleVisibility(twitterContainer, visible);
    if (visible) {
      const content = formatPlayerOverlayContent(player);
      if (content !== "") {
        SetInnerHtml($(`.p${t + 1} .twitter`), content);
      }
    }
  });
};

window.UpdateTwitterMatch = async () => {
  await window.UpdateTwitter();
  await window.UpdateMatch();
};

window.resetIntervals = () => {
  clearInterval(overlayState.intervalID);

  // Do one immediate update so users don't wait 9s
  const rotate = () => {
    const player1 = overlayState.data.score[window.scoreboardNumber].team["1"].player["1"];
    const player2 = overlayState.data.score[window.scoreboardNumber].team["2"].player["1"];
    const validPlayerModes = getAvailableDisplayModes(player1, player2, overlayState.displayModes);
    const matchDisplayFieldMap = getMatchDisplayFieldMap(overlayState.data.score[window.scoreboardNumber]);
    const validMatchModes = overlayState.matchDisplayModes.filter(mode => matchDisplayFieldMap[mode]);

    if (validPlayerModes.length > 0) {
      overlayState.currentPlayerModeIndex = (overlayState.currentPlayerModeIndex + 1) % validPlayerModes.length;
    }
    if (validMatchModes.length > 0) {
      overlayState.matchModeIndex = (overlayState.matchModeIndex + 1) % validMatchModes.length;
    }

    window.UpdateTwitter();
    window.UpdateMatch();
  };

  // rotate(); // immediately update
  overlayState.intervalID = setInterval(rotate, ROTATION_INTERVAL);
};


  const DisplayEntityName = async (t, nameOrPlayer, isTeam = false) => {
    const selector = `.p${t + 1}.container .name`;
    const bothLosers = overlayState.bothLosers;
    const neitherLoser = overlayState.neitherLoser;
  
    if (isTeam) {
      const teamName = nameOrPlayer;
      const teamNameInWinners = localStorage.getItem("teamNameInWinners")?.toLowerCase();
  
      const getSuffix = (name, losers) => {
        if (bothLosers) {
          return teamNameInWinners === name?.toLowerCase() ? "(WL)" : "(L)";
        } else if (neitherLoser) {
          return "";
        } else {
          return losers ? "(L)" : "(W)";
        }
      };
  
      SetInnerHtml($(selector), `<span>${teamName} ${getSuffix(teamName, t === 0 ? overlayState.team1Losers : overlayState.team2Losers)}</span>`);
    } else {
      const player = nameOrPlayer;
      const playerInWinners = JSON.parse(localStorage.getItem("playerInWinners") || "{}");
  
      const getSuffix = (p, losers) => {
        if (bothLosers) {
          return playerInWinners.name?.toLowerCase() === p.name?.toLowerCase() ? "(WL)" : "(L)";
        } else if (neitherLoser) {
          return "";
        } else {
          return losers ? "(L)" : "(W)";
        }
      };
  
      await setName(selector, player.team, player.name, getSuffix(player, t === 0 ? overlayState.team1Losers : overlayState.team2Losers));
    }
  };
  
