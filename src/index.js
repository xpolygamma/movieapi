async function tmdb(url, env) {
	return await fetch(`https://api.themoviedb.org/3${url}`, { headers: {
		'accept': 'application/json',
		'Authorization': 'Bearer '+env.API_KEY
	}}).then(r=>r.json()).catch(console.error);
}
function makeResp(json=null, status=200) {
	return new Response(
		JSON.stringify(json) || null,
		{ status, headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': '*'
		}}
	)
}

export default {
	async fetch(req, env, ctx) {
		if (req.method === 'OPTIONS') return makeResp();

		const url = new URL(req.url);
		const data = {
			path: url.pathname.slice(1),
			query: url.search.slice(1),
			params: url.searchParams
		};

		if (data.path === 'series') {
			let id = await getid(data.query, env);
			if (id[1] !== 'tv') return makeResp({ success: true, id: id[0], tv: false });
			id = id[0];

			const resp = await tmdb(`/tv/${id}?language=en-GB`, env);

			if (resp.success && resp.seasons) {
				let seasons = resp.seasons.map(s => [
					s.season_number,
					s.name,
					s.episode_count
				]);

				return makeResp({ success: true, id, tv: true, seasons });
			} else {
				return makeResp({ success: true, id, tv: false });
			}
		} else if (data.path === 'search') {
			const page = data.params.get('p') || 1;
			const resp = await tmdb(`/search/multi?query=${data.params.get('q')}&include_adult=true&language=en-GB&page=${page}`, env);

			if (resp.success !== false) {
				let results = resp.results.filter(i => ['movie', 'tv'].includes(i.media_type)).map(i => [
					i.id,
					(i.name || i.original_name) || (i.title || i.original_title),
					i.poster_path,
					i.media_type,
					i.release_date || i.first_air_date,
					i.vote_avg
				]);

				return makeResp({ success: true, results, more: resp.total_pages > page});
			} else {
				return makeResp({ success: false, error: resp.status_message });
			}
		}

		return makeResp({ success: false });
	},
};

async function getid(ref, env) {
	let pid;
	if (ref.startsWith('tt')) {
		let resp = await tmdb(`/find/${imdb}?external_source=imdb_id&language=en-GB`, env);
		resp = resp.tv_results || resp.movie_results;

		return [resp.id, resp.media_type];
	} else pid = parseInt(ref);

	if (pid) return pid;
	return null;
}