# scoreboard_vgbootcampy2021

# How to change the rotation interval (time it takes to show the next info)

- Edit the ROTATION_INTERVAL. If you want to change it to 9000 milliseconds (9 seconds), do this:

```js
const ROTATION_INTERVAL = 9000;
```

# How to add new mode to the tournament container on the top left:

1. Add a new mode to matchDisplayModes.

```js
matchDisplayModes: ["!bracket", "match", "best_of_text"];
```

2. Add what that mode will show in getMatchDisplayFieldMap function.

```js
function getMatchDisplayFieldMap(score) {
  return {
    "!bracket": "!BRACKET",
    match: score.match,
    best_of_text: score.best_of_text,
  };
}
```

# How to add new mode to the Twitter/pronoun container of the players:

1. Add a new mode to displayModes.

```js
displayModes: ["seed", "twitter", "pronoun"];
```

2. Add what the mode will show in getPlayerDisplayFieldMap

```js
function getPlayerDisplayFieldMap(player) {
  return {
    seed: player.seed ? `SEED ${player.seed}` : "",
    twitter: player.twitter
      ? `<span class="twitter_logo"></span>@${player.twitter}`
      : "",
    pronoun: player.pronoun.toUpperCase(),
  };
}
```
