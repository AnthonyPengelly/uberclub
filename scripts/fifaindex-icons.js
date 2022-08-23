var script = document.createElement("script");
script.src = "https://code.jquery.com/jquery-3.4.1.min.js";
script.type = "text/javascript";
document.getElementsByTagName("head")[0].appendChild(script);

const mapStarRating = (rating) => {
  if (rating >= 97) return 7;
  if (rating >= 92) return 6;
  if (rating >= 88) return 5;
  if (rating >= 84) return 4;
  if (rating >= 79) return 3;
  if (rating >= 75) return 2;
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
const collectionId = "619a54cf-02ce-461f-a73c-e01ec4b34fc9";
// Use the timeout to click into the webpage and focus
setTimeout(() => {
  navigator.clipboard.readText().then((copied) => {
    const query = $(".table-players tbody tr[data-playerid]")
      .map((i, e) => {
        const row = $(e);
        const summary = {
          name: row.find('[data-title="Name"] a').text().trim("\n"),
          team: row
            .find(".team")
            .attr("alt"),
          position: mapPosition(
            row
              .find('[data-title="Preferred Positions"] a')
              .first()
              .attr("title")
          ),
          overall: mapStarRating(
            parseInt(
              row.find('[data-title="OVR / POT"] span').first().text(),
              10
            )
          ),
          potential: mapStarRating(
            parseInt(row.find('[data-title="OVR / POT"] span').eq(1).text(), 10)
          ),
          image: row.find(".player img").attr("src").replace(".png", "@2x.png"),
          countryName: row.find(".link-nation").first().attr("title"),
          countryImage: row
            .find(".link-nation img")
            .first()
            .attr("src")
            .replace(".png", "@2x.png"),
        };
        summary.potential = Math.max(summary.potential, summary.overall);
          if (summary.team) { return ""}
          summary.team = 'Icons';
        return (
          `INSERT INTO public.real_teams (name, player_collection_id) SELECT '${summary.team}', '${collectionId}' ` +
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