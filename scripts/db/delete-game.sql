-- Game RESET
DELETE FROM public.player_transfers
WHERE player_game_state_id IN (SELECT id FROM public.player_game_states WHERE game_id = '5812a7aa-6a48-429f-983c-ad463c681a0c');

DELETE FROM public.transfer_bids
WHERE buying_team_id IN (SELECT id FROM public.teams WHERE game_id = '5812a7aa-6a48-429f-983c-ad463c681a0c');

DELETE FROM public.fixture_lineups
WHERE player_game_state_id IN (SELECT id FROM public.player_game_states WHERE game_id = '5812a7aa-6a48-429f-983c-ad463c681a0c');

DELETE FROM public.results
WHERE season_id IN (SELECT id FROM public.seasons WHERE game_id = '5812a7aa-6a48-429f-983c-ad463c681a0c');

DELETE FROM public.training_logs
WHERE season_id IN (SELECT id FROM public.seasons WHERE game_id = '5812a7aa-6a48-429f-983c-ad463c681a0c');

DELETE FROM public.scouting_logs
WHERE season_id IN (SELECT id FROM public.seasons WHERE game_id = '5812a7aa-6a48-429f-983c-ad463c681a0c');

DELETE FROM public.improvement_logs
WHERE season_id IN (SELECT id FROM public.seasons WHERE game_id = '5812a7aa-6a48-429f-983c-ad463c681a0c');

DELETE FROM public.game_logs
WHERE game_id = '5812a7aa-6a48-429f-983c-ad463c681a0c';

DELETE FROM public.deadline_day_bids
WHERE team_id IN (SELECT id FROM public.teams WHERE game_id = '5812a7aa-6a48-429f-983c-ad463c681a0c');

DELETE FROM public.deadline_day_players
WHERE season_id IN (SELECT id FROM public.seasons WHERE game_id = '5812a7aa-6a48-429f-983c-ad463c681a0c');

DELETE FROM public.team_seasons
WHERE season_id IN (SELECT id FROM public.seasons WHERE game_id = '5812a7aa-6a48-429f-983c-ad463c681a0c');

DELETE FROM public.seasons
WHERE game_id = '5812a7aa-6a48-429f-983c-ad463c681a0c';

DELETE FROM public.player_game_states
WHERE game_id = '5812a7aa-6a48-429f-983c-ad463c681a0c';

DELETE FROM public.teams
WHERE game_id = '5812a7aa-6a48-429f-983c-ad463c681a0c';


DELETE FROM public.games
WHERE id = '5812a7aa-6a48-429f-983c-ad463c681a0c';