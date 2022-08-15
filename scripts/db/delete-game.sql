-- Game RESET
DELETE FROM public.fixture_lineups
WHERE player_game_state_id IN (SELECT id FROM public.player_game_states WHERE game_id = 'b5dc2f56-3135-4ece-b8a4-ca0955acefd7');

DELETE FROM public.results
WHERE season_id IN (SELECT id FROM public.seasons WHERE game_id = 'b5dc2f56-3135-4ece-b8a4-ca0955acefd7');

DELETE FROM public.training_logs
WHERE season_id IN (SELECT id FROM public.seasons WHERE game_id = 'b5dc2f56-3135-4ece-b8a4-ca0955acefd7');

DELETE FROM public.scouting_logs
WHERE season_id IN (SELECT id FROM public.seasons WHERE game_id = 'b5dc2f56-3135-4ece-b8a4-ca0955acefd7');

DELETE FROM public.improvement_logs
WHERE season_id IN (SELECT id FROM public.seasons WHERE game_id = 'b5dc2f56-3135-4ece-b8a4-ca0955acefd7');

DELETE FROM public.game_logs
WHERE game_id = 'b5dc2f56-3135-4ece-b8a4-ca0955acefd7';

DELETE FROM public.deadline_day_bids
WHERE team_id IN (SELECT id FROM public.teams WHERE game_id = 'b5dc2f56-3135-4ece-b8a4-ca0955acefd7');

DELETE FROM public.deadline_day_players
WHERE season_id IN (SELECT id FROM public.seasons WHERE game_id = 'b5dc2f56-3135-4ece-b8a4-ca0955acefd7');

DELETE FROM public.team_seasons
WHERE season_id IN (SELECT id FROM public.seasons WHERE game_id = 'b5dc2f56-3135-4ece-b8a4-ca0955acefd7');

DELETE FROM public.seasons
WHERE game_id = 'b5dc2f56-3135-4ece-b8a4-ca0955acefd7';

DELETE FROM public.player_game_states
WHERE game_id = 'b5dc2f56-3135-4ece-b8a4-ca0955acefd7';

DELETE FROM public.teams
WHERE game_id = 'b5dc2f56-3135-4ece-b8a4-ca0955acefd7';


DELETE FROM public.games
WHERE id = 'b5dc2f56-3135-4ece-b8a4-ca0955acefd7';