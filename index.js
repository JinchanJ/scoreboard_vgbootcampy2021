const ROTATION_INTERVAL = 9000;

const overlayState = {
  lastDisplayedMatchText: "",
      matchDisplayModes: ["match", "best_of_text"],
  displayModes: ["twitter", "pronoun"],
  currentModeIndex: 0,
  p1Twitter: "", p2Twitter: "", p1Pronoun: "", p2Pronoun: "",
  savedBestOf: 0, savedMatch: "", firstTime: true, intervalID: "",
    player1: "", player2: "", team1Name: "", team2Name: "",
  team1Losers: false, team2Losers: false,
  data: null
};

function forEachTeamPlayer(data, callback) {
  ["1", "2"].forEach((num, t) => {
    const team = data.score[window.scoreboardNumber].team[num];
    Object.values(team.player).forEach((player, p) => {
      if (player) callback(team, t, player, p);
    });
  });
}

const setName = async (selector, team, name, suffix = "") => {
  SetInnerHtml($(selector), `
    <span>
      <span class="sponsor">${team ? team.replace(/\s*[\|\/\\]\s*/g, ' ') : ""}</span>
      ${name ? await Transcript(name) : ""} ${suffix}
    </span>
  `);
};

const toggleVisibility = (el, visible) => {
  if (overlayState.firstTime) return;
  gsap.to(el, { duration: 0.5, opacity: visible ? 1 : 0 });
};

const formatPlayerOverlayContent = (player) => {
  const modes = overlayState.displayModes;
  for (let i = 0; i < modes.length; i++) {
    const mode = modes[(overlayState.currentModeIndex + i) % modes.length];
    switch (mode) {
      case "twitter":
        if (player.twitter) return `<span class="twitter_logo"></span>@${player.twitter}`;
        break;
      case "pronoun":
        if (player.pronoun) return player.pronoun.toUpperCase();
        break;
            default:
        break;
    }
  }
  return "";
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

const DisplayName = async (t, player) => {
  
  if (t === 0) { overlayState.player1 = player; overlayState.team1Losers = overlayState.data.score[window.scoreboardNumber].team["1"].losers; }
  if (t === 1) { overlayState.player2 = player; overlayState.team2Losers = overlayState.data.score[window.scoreboardNumber].team["2"].losers; }
  const playerInWinners = JSON.parse(localStorage.getItem("playerInWinners"));
  

  const getSuffix = (p, other, losers) =>
    overlayState.team1Losers && overlayState.team2Losers
      ? compareObjects(playerInWinners, p) ? "(WL)" : "(L)"
      : losers ? "(L)" : overlayState.team1Losers || overlayState.team2Losers ? "(W)" : "";

  await setName(".p1.container .name", overlayState.player1.team, overlayState.player1.name, getSuffix(overlayState.player1, overlayState.player2, overlayState.team1Losers));
  await setName(".p2.container .name", overlayState.player2.team, overlayState.player2.name, getSuffix(overlayState.player2, overlayState.player1, overlayState.team2Losers));

  if (t === 1 && overlayState.player1.name && !overlayState.team1Losers && overlayState.team2Losers) {
    localStorage.setItem("playerInWinners", JSON.stringify(overlayState.player1));
  } else if (t === 1 && overlayState.player2.name && overlayState.team1Losers && !overlayState.team2Losers) {
    localStorage.setItem("playerInWinners", JSON.stringify(overlayState.player2));
  }
};

const DisplayTeamName = async (t, teamName) => {
  
  const team = overlayState.data.score[window.scoreboardNumber].team[String(t + 1)];
  if (t === 0) { overlayState.team1Name = teamName; overlayState.team1Losers = team.losers; }
  if (t === 1) { overlayState.team2Name = teamName; overlayState.team2Losers = team.losers; }
  const teamNameInWinners = localStorage.getItem("teamNameInWinners");
  

  const getSuffix = (name, losers) =>
    overlayState.team1Losers && overlayState.team2Losers
      ? name === teamNameInWinners ? "(WL)" : "(L)"
      : losers ? "(L)" : overlayState.team1Losers || overlayState.team2Losers ? "(W)" : "";

  SetInnerHtml($(`.p1.container .name`), `<span>${overlayState.team1Name} ${getSuffix(overlayState.team1Name, overlayState.team1Losers)}</span>`);
  SetInnerHtml($(`.p2.container .name`), `<span>${overlayState.team2Name} ${getSuffix(overlayState.team2Name, overlayState.team2Losers)}</span>`);

  if (t === 1 && overlayState.team1Name && !overlayState.team1Losers && overlayState.team2Losers) {
    localStorage.setItem("teamNameInWinners", overlayState.team1Name);
  } else if (t === 1 && overlayState.team2Name && overlayState.team1Losers && !overlayState.team2Losers) {
    localStorage.setItem("teamNameInWinners", overlayState.team2Name);
  }
};

window.Update = async (event) => {
  console.log("Update triggered", { event });
  const { data: newData, oldData } = event;
  overlayState.data = newData;

  // Display player or team names and scores
  forEachTeamPlayer(newData, async (team, t, player) => {
    const playerCount = Object.keys(team.player).length;
    if (playerCount === 1) {
      await DisplayName(t, player);
    } else {
      const names = await Promise.all(
        Object.values(team.player).map(p => Transcript(p.name))
      );
      const teamName = team.teamName || names.join(" / ");
      await DisplayTeamName(t, teamName);
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

  forEachTeamPlayer(newData, (team, t, player) => {
    if (t === 0 && (player.twitter !== overlayState.p1Twitter || player.pronoun !== overlayState.p1Pronoun)) {
      twitterChanged = true;
    }
    if (t === 1 && (player.twitter !== overlayState.p2Twitter || player.pronoun !== overlayState.p2Pronoun)) {
      twitterChanged = true;
    }
  });

  const score = newData.score[window.scoreboardNumber];
  if (score.best_of !== overlayState.savedBestOf || score.match !== overlayState.savedMatch) {
    matchChanged = true;
  }

  if (twitterChanged || matchChanged) {
    await window.UpdateTwitterMatch();
    window.resetIntervals();
    overlayState.firstTime = false;
  }

  if (overlayState.firstTime) {
    window.resetIntervals();
    overlayState.firstTime = false;
  }
};

LoadEverything().then(() => {

  function getNextModeIndex() {
    return (overlayState.currentModeIndex + 1) % overlayState.displayModes.length;
  }
    
  const startingAnimation = gsap.timeline({ paused: true })
    .from([".logo"], { duration: 0.5, autoAlpha: 0, ease: "power2.inOut" }, 0.5)
    .from([".anim_container_outer"], { duration: 1, width: "162px", ease: "power2.inOut" }, "<70%")
    .from([".p1.twitter_container"], { duration: 1, opacity: 0, x: "-373px", ease: "power2.inOut" }, "<")
    .from([".p2.twitter_container"], { duration: 1, opacity: 0, x: "373px", ease: "power2.inOut" }, "<")
    .from(".tournament_container", { opacity: 0, duration: 0.5, ease: "power4.Out" });

  window.UpdateMatch = async () => {
    console.log("UpdateMatch triggered");
    const score = overlayState.data.score[window.scoreboardNumber];
    const tournamentContainer = document.querySelector(".tournament_container");
    toggleVisibility(tournamentContainer, !!(score.best_of || score.match));

    const displayModes = overlayState.matchDisplayModes.map(mode => {
      
      switch (mode) {
      case "match":
        return score.match;
      case "best_of_text":
        return score.best_of_text;
                  default:
          return "";
      }
    }).filter(Boolean);

    const matchElement = $(".match");
    const displayText = displayModes[overlayState.currentModeIndex % displayModes.length] ?? "";
    SetInnerHtml(matchElement, displayText);

    overlayState.savedBestOf = score.best_of;
    overlayState.savedMatch = score.match;
  };

  window.UpdateTwitter = async () => {
    console.log("UpdateTwitter triggered");
  forEachTeamPlayer(overlayState.data, (team, t, player) => {
    const twitterContainer = document.querySelector(`.p${t + 1}.twitter_container`);
    const isSolo = Object.values(team.player).length === 1;
    const visible = (player.twitter || player.pronoun) && isSolo;

    toggleVisibility(twitterContainer, visible);
    if (visible) {
      SetInnerHtml($(`.p${t + 1} .twitter`), formatPlayerOverlayContent(player));
    }

    if (t === 0) [overlayState.p1Twitter, overlayState.p1Pronoun] = [player.twitter, player.pronoun];
    else [overlayState.p2Twitter, overlayState.p2Pronoun] = [player.twitter, player.pronoun];
  });
};

  window.UpdateTwitterMatch = async () => {
    console.log("UpdateTwitterMatch triggered");
    await window.UpdateTwitter();
    await window.UpdateMatch();
  };
  window.resetIntervals = () => {
    console.log("resetIntervals called");
    clearInterval(overlayState.intervalID);
    
    overlayState.intervalID = setInterval(() => {
      console.log("Rotating to mode:", overlayState.displayModes[(overlayState.currentModeIndex + 1) % overlayState.displayModes.length]);
      const nextMode = getNextModeIndex();
      if (nextMode !== null) {
        overlayState.currentModeIndex = nextMode;
      }
      window.UpdateTwitter();
      window.UpdateMatch();
    }, ROTATION_INTERVAL);
  };

  window.Start = async () => {
    startingAnimation.restart();
    window.resetIntervals();
  };
});
