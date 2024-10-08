const mapStarRating = (rating) => {
  if (rating >= 97) return 7;
  if (rating >= 90) return 6;
  if (rating >= 86) return 5;
  if (rating >= 80) return 4;
  if (rating >= 75) return 3;
  if (rating >= 70) return 2;
  return 1;
};

const mapPosition = (position) => {
  switch (position) {
    case "LF":
    case "ST":
    case "RF":
    case "LW":
    case "CF":
    case "RW":
    case "RS":
    case "LS":
      return "FWD";
    case "CAM":
    case "LCAM":
    case "RCAM":
    case "LWM":
    case "RWM":
    case "LM":
    case "CM":
    case "RM":
    case "CDM":
      return "MID";
    case "LWB":
    case "LB":
    case "CB":
    case "RB":
    case "RWB":
    case "SW":
      return "DEF";
    case "GK":
      return "GKP";
    default:
      throw position;
  }
};

// Grab this id in advance
const collectionId = "130142b1-dbb3-439d-b48a-bd5375d1041b";
// Use the timeout to click into the webpage and focus
setTimeout(() => {
  navigator.clipboard.readText().then((copied) => {
    const query = $("table .table-row")
      .map((i, e) => {
        const row = $(e);
        const stats = row.find(".statCol");
        const summary = {
          name: row.find(".name").text().trim("\n"),
          countryName: row
            .find(".nation")
            .attr("src"),
          countryImage: row
            .find(".nation")
            .attr("src"),
          team: row
            .find(".team")
            .text()
            .trim("\n")
            .trim(" ")
            .replace(/.*\|+ /, ""),
          teamImage: row
            .find(".club")
            .attr("src"),
          position: mapPosition($(stats[2]).text().trim("\n").trim(" ")),
          overall: mapStarRating(parseInt($(stats[0]).text().trim("\n"), 10)),
          potential: mapStarRating(parseInt($(stats[1]).text().trim("\n"), 10)),
          image: row.find(".player-img").attr("src"),
        };
        summary.potential = Math.max(summary.potential, summary.overall);
        return (
          `INSERT INTO public.real_teams (name, player_collection_id, image_url) SELECT '${summary.team}', '${collectionId}', '${summary.teamImage}' ` +
          `WHERE NOT EXISTS (SELECT id FROM public.real_teams WHERE name = '${summary.team}' AND player_collection_id = '${collectionId}');` +
          `INSERT INTO public.real_countries (name, player_collection_id, image_url) SELECT '${summary.countryName}', '${collectionId}', '${summary.countryImage}' ` +
          `WHERE NOT EXISTS (SELECT id FROM public.real_countries WHERE name = '${summary.countryName}' AND player_collection_id = '${collectionId}');` +
          `INSERT INTO public.real_players (name, overall, potential, real_team_id, real_country_id, position_id, image_url) VALUES` +
          `('${summary.name}', ${summary.overall}, ${summary.potential}, ` +
          `(SELECT id from public.real_teams WHERE name = '${summary.team}' AND player_collection_id = '${collectionId}'), ` +
          `(SELECT id from public.real_countries WHERE name = '${summary.countryName}' AND player_collection_id = '${collectionId}'), ` +
          `(SELECT id from public.positions WHERE name = '${summary.position}'), ` +
          `'${summary.image}');`
        );
      })
      .toArray()
      .join("");

    console.log(query);
    navigator.clipboard.writeText(copied + query);
  });
}, 5000);
