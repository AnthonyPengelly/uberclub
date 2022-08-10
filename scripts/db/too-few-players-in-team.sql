INSERT INTO public.real_teams (name, player_collection_id)
VALUES ('Rest of World', 'cb9d54f8-c9e0-453d-8be7-a7b5d75aeaed');

UPDATE public.real_players
SET real_team_id = (SELECT id FROM public.real_teams WHERE name = 'Rest of World' AND player_collection_id = 'cb9d54f8-c9e0-453d-8be7-a7b5d75aeaed')
WHERE real_team_id IN(
  SELECT team.id from public.real_teams team
  JOIN public.real_players player ON player.real_team_id = team.id
  WHERE team.player_collection_id = 'cb9d54f8-c9e0-453d-8be7-a7b5d75aeaed'
  GROUP BY team.id
  HAVING COUNT(team.id) < 13
  ORDER BY COUNT(team.id)
);

DELETE FROM public.real_teams
WHERE id NOT IN (select real_team_id from public.real_players);