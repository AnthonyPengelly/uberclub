const mapStarRating = (rating) => {
  if (rating >= 90) return 6;
  if (rating >= 87) return 5;
  if (rating >= 83) return 4;
  if (rating >= 79) return 3;
  if (rating >= 77) return 2;
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
      return "FWD";
    case "CAM":
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
      return "DEF";
    case "GK":
      return "GKP";
    default:
      throw position;
  }
};

const getMinBidPrice = (overall, potential) => {
  const priceFromOverall = overall * 10;
  if (potential > overall) {
    return priceFromOverall + potential;
  }
  return priceFromOverall;
};

const getScoutPriceFromOverall = (overall) => {
  switch (overall) {
    case 1:
    case 2:
    case 3:
      return 5 * overall;
    case 4:
      return 22;
    case 5:
      return 30;
    case 6:
      return 40;
    default:
      throw overall;
  }
};

const getScoutPrice = (overall, potential) => {
  const priceFromOverall = getScoutPriceFromOverall(overall);
  if (potential > overall) {
    return priceFromOverall + potential;
  }
  return priceFromOverall;
};

$("body").append($("<div>", { class: "superclub-players" }));

$("table .table-row")
  .map((i, e) => {
    const row = $(e);
    const stats = row.find(".statCol");
    const summary = {
      name: row.find(".name").text().trim("\n"),
      team: row.find(".team").text().trim("\n").trim(" ").trim(" | ENG 1"),
      position: mapPosition($(stats[2]).text().trim("\n").trim(" ")),
      overall: mapStarRating(parseInt($(stats[0]).text().trim("\n"), 10)),
      potential: mapStarRating(parseInt($(stats[1]).text().trim("\n"), 10)),
      image: `https://www.futwiz.com${row.find(".player-img").attr("src")}`,
    };
    // (name, overall, potential, realTeamId, positionId, imageUrl)
    return (
      `('${summary.name}', ${summary.overall}, ${summary.potential}, ` +
      `(SELECT id from public.realTeams WHERE name = '${summary.team}'), ` +
      `(SELECT id from public.positions WHERE name = '${summary.position}'), ` +
      `'${summary.image}')`
    );
  })
  .toArray()
  .join(",");
