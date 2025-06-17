const MOODS = [
  "Uplifting","Sad","Heartbreak","Party","Hopeful"," Fire",
  "Chill","Motivation","Romantic","Nostalgic","Dreamy",
"Energetic","Melancholy","In Love","Breakup","Angry",
  "Happy","Peaceful","Dark","Epic","Dance"
];


const NETLIFY_FUNCTION_BASE_URL = '/.netlify/functions/proxy';

let userProfile, favorites, moodTags, leaderboard, comments;
let currentSong = null; 
let lastResults = []; 
let lastAlbums = {}; 

const lyricSearchForm = document.getElementById('lyric-search-form');
const artistInput = document.getElementById('artist-input');
const songInput = document.getElementById('song-input');
const lyricsDisplayDiv = document.getElementById('lyrics-display');
const artistInfoDiv = document.getElementById('artist-info');

const copyLyricsBtn = document.getElementById('copy-lyrics-btn');
const saveLyricsBtn = document.getElementById('save-lyrics-btn');
const moodTaggingDiv = document.getElementById('mood-tagging');
const moodInput = document.getElementById('mood-input');
const addMoodBtn = document = document.getElementById('add-mood-btn');
const currentMoodsDiv = document.getElementById('current-moods');

const savedLyricsList = document.getElementById('saved-lyrics-list');



document.addEventListener('DOMContentLoaded', () => {

  userProfile = JSON.parse(localStorage.getItem('lyricme_profile')||'null');
  favorites = JSON.parse(localStorage.getItem('lyricme_favorites')||'[]');
  moodTags = JSON.parse(localStorage.getItem('lyricme_moodtags')||'{}');
  leaderboard = JSON.parse(localStorage.getItem('lyricme_leaderboard')||'{}');
  comments = JSON.parse(localStorage.getItem('lyricme_comments')||'{}');


  if(localStorage.getItem('lyricme_theme')==='dark'){document.body.classList.add('dark');}

  
  renderProfileBtn();
  renderFavorites();
  renderMoodCloud();
  showLyricOfDay(); 

 
  document.getElementById('toggleMode').onclick = () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('lyricme_theme',document.body.classList.contains('dark')?'dark':'light');
  };
  document.getElementById('profileBtn').onclick = openProfileModal;
  document.getElementById('searchBtn').onclick = searchMusic;
  document.getElementById('searchInput').addEventListener('keypress',e=>{if(e.key==='Enter')searchMusic();});
  document.getElementById('searchInput').addEventListener('input', showSuggestions);
  document.getElementById('suggestions').onclick = function(e){
    if(e.target&&e.target.nodeName==="DIV"){
      document.getElementById('searchInput').value = e.target.textContent;
      this.classList.remove('active');
      searchMusic();
    }
  };
  document.getElementById('modalBg').onclick = function(e){if(e.target===this)closeModal();}
});


lyricSearchForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 

    const artist = artistInput.value.trim();
    const song = songInput.value.trim();

    if (!artist || !song) {
        lyricsDisplayDiv.innerHTML = '<p style="color: red;">Please enter both artist and song title.</p>';
        artistInfoDiv.innerHTML = '';
        copyLyricsBtn.style.display = 'none';
        saveLyricsBtn.style.display = 'none';
        moodTaggingDiv.style.display = 'none';
        currentMoodsDiv.innerHTML = '';
        return;
    }

    lyricsDisplayDiv.innerHTML = 'Loading lyrics...';
    artistInfoDiv.innerHTML = '';
    copyLyricsBtn.style.display = 'none';
    saveLyricsBtn.style.display = 'none';
    moodTaggingDiv.style.display = 'none';
    currentMoodsDiv.innerHTML = '';

    try {
     
       
        const lyricsApiUrl = `${NETLIFY_FUNCTION_BASE_URL}/${encodeURIComponent(artist)}/${encodeURIComponent(song)}`;
        const lyricsResponse = await fetch(lyricsApiUrl);

        if (!lyricsResponse.ok) {
            let errorMessage = `<p style="color: red;">Lyrics not found for "${song}" by "${artist}".</p>`;
            const errorData = await lyricsResponse.json().catch(() => ({}));
            if (errorData.error) {
                errorMessage = `<p style="color: red;">${errorData.error}. Please check artist and song title.</p>`;
            } else if (lyricsResponse.status === 500) {
                errorMessage = `<p style="color: red;">Server error fetching lyrics. Please try again.</p>`;
            } else if (lyricsResponse.status === 404) {
                errorMessage = `<p style="color: red;">Lyrics not found for "${song}" by "${artist}".</p>`;
            }
            lyricsDisplayDiv.innerHTML = errorMessage;
            console.error('Lyrics Fetch Error:', lyricsResponse.status, errorData);
        } else {
            const lyricsData = await lyricsResponse.json();
            if (lyricsData.lyrics) {
                lyricsDisplayDiv.textContent = lyricsData.lyrics;
                copyLyricsBtn.style.display = 'inline-block';
                saveLyricsBtn.style.display = 'inline-block';
                moodTaggingDiv.style.display = 'block';

                lyricsDisplayDiv.dataset.currentArtist = artist;
                lyricsDisplayDiv.dataset.currentSong = song;

            } else {
                lyricsDisplayDiv.innerHTML = '<p>Lyrics not found for this song. Try another one!</p>';
            }
        }

        const deezerSearchUrl = `${NETLIFY_FUNCTION_BASE_URL}/deezer-search?q=${encodeURIComponent(artist)}%20${encodeURIComponent(song)}`;

        const deezerResponse = await fetch(deezerSearchUrl);

        if (!deezerResponse.ok) {
            console.error('Deezer API Error:', deezerResponse.status, 'Response:', await deezerResponse.text());
            artistInfoDiv.innerHTML += '<p style="color: orange;">Could not fetch artist/album info from Deezer.</p>';
        } else {
            const deezerData = await deezerResponse.json();
            console.log("Deezer Data:", deezerData);

            if (deezerData.data && deezerData.data.length > 0) {
                const firstTrack = deezerData.data[0];

                const artistName = firstTrack.artist.name;
                const artistPicture = firstTrack.artist.picture_medium;
                const albumTitle = firstTrack.album.title.replace(/ *\([^)]*\) */g, ""); 
                const albumCover = firstTrack.album.cover_medium;

                artistInfoDiv.innerHTML = `
 <div class="artist-info-card">
  <img src="${artistPicture}" alt="${artistName} Picture" class="artist-picture">
  <div class="artist-details">
   <h3>${artistName}</h3>
   <p>Album: ${albumTitle}</p>
    <img src="${albumCover}" alt="${albumTitle} Album Cover" class="album-cover">
     </div>
    </div>
        `;
if (firstTrack.preview) {
                    artistInfoDiv.innerHTML += `
                        <audio controls class="song-preview">
                            <source src="${firstTrack.preview}" type="audio/mpeg">
                            Your browser does not support the audio element.
                        </audio>
                    `;
                }
            } else {
                artistInfoDiv.innerHTML += '<p>No matching artist or album found on Deezer.</p>';
            }
        }

    } catch (error) {
        lyricsDisplayDiv.innerHTML = '<p style="color: red;">A network or unexpected error occurred. Please try again later.</p>';
        artistInfoDiv.innerHTML = '';
        console.error('Overall Fetch operation failed:', error);
    }
});
function showLyricOfDay() {
    const artists = ["Adele", "Ed Sheeran", "Drake", "Beyonce", "Eminem", "Taylor Swift", "Billie Eilish"];
    const artist = artists[Math.floor(Math.random()*artists.length)];
  
    fetch(`${NETLIFY_FUNCTION_BASE_URL}/deezer-search?q=artist:"${encodeURIComponent(artist)}"`).then(r=>r.json()).then(data=>{
        if(!data.data.length)return;
        const track = data.data[Math.floor(Math.random()*data.data.length)];
        
        fetch(`${NETLIFY_FUNCTION_BASE_URL}/${encodeURIComponent(track.artist.name)}/${encodeURIComponent(track.title)}`)
            .then(r=>r.json()).then(lyricData=>{
                const lyric = lyricData.lyrics||"Lyrics not found.";
                document.getElementById('lyricOfDay').innerHTML = `<b>Lyric of the Day:</b> <i>${track.title}</i> by <b>${track.artist.name}</b><br>
                <span style="font-size:.98rem;">${lyric.slice(0,110)}${lyric.length>110?'...':''}</span>`;
            });
    });
}


function showSuggestions() {
    const query = document.getElementById('searchInput').value.trim();
    const mode = document.querySelector('input[name="searchMode"]:checked').value;
    const sugDiv = document.getElementById('suggestions');
    if(!query){sugDiv.classList.remove('active'); sugDiv.innerHTML = ""; return;}
    let q = mode==="artist" ? `artist:"${query}"` : mode==="album" ? `album:"${query}"` : `track:"${query}"`;
   
    fetch(`${NETLIFY_FUNCTION_BASE_URL}/deezer-search?q=${encodeURIComponent(q)}`).then(r=>r.json()).then(data=>{
        if(!data.data.length){sugDiv.classList.remove('active'); return;}
        const arr = [];
        if(mode==="artist"){
            let seen = {};
            data.data.forEach(d=>{ if(!seen[d.artist.name]){ arr.push(d.artist.name); seen[d.artist.name]=1; } });
        }else if(mode==="album"){
            let seen = {};
            data.data.forEach(d=>{ if(!seen[d.album.title]){ arr.push(d.album.title); seen[d.album.title]=1; } });
        }else{
            data.data.forEach(d=>{ arr.push(`${d.title} - ${d.artist.name}`); });
        }
        sugDiv.innerHTML = arr.slice(0,8).map(s=>`<div>${s}</div>`).join('');
        sugDiv.classList.add('active');
    });
}


function searchMusic() {
    const query = document.getElementById('searchInput').value.trim();
    const mode = document.querySelector('input[name="searchMode"]:checked').value;
    if(!query)return;
    const results = document.getElementById('resultSection');
    const details = document.getElementById('detailsSection');
    details.classList.add('hidden');
    results.innerHTML = `<div style="margin:2rem auto;">Searching...</div>`;
    let q = mode==="artist" ? `artist:"${query}"` : mode==="album" ? `album:"${query}"` : `track:"${query}"`;
  
    fetch(`${NETLIFY_FUNCTION_BASE_URL}/deezer-search?q=${encodeURIComponent(q)}`).then(r=>r.json()).then(data=>{
        if(!data.data.length){results.innerHTML = `<div>No results found.</div>`; return;}
        lastResults = data.data;
        if(mode==="album") { 

            let albumId = data.data[0]?.album?.id;
            if(albumId) {
                showAlbumTracks(albumId);
                return;
            }
        }

        results.innerHTML = data.data.slice(0,18).map(d=>`
            <div class="result-card" data-id="${d.id}">
                <img class="result-thumb" src="${d.album.cover_medium}" alt="album">
                <div class="result-title">${d.title}</div>
                <div class="result-artist">${d.artist.name}</div>
                <div class="result-album">${d.album.title}</div>
                <div class="result-year">${d.release_date?.slice(0,4) || ''}</div>
            </div>
        `).join('');
        Array.from(results.querySelectorAll('.result-card')).forEach(card=>{
            card.onclick = ()=>showSongDetails(card.getAttribute('data-id'));
        });
    });
    document.getElementById('suggestions').classList.remove('active');
}

function showAlbumTracks(albumId) {
    const results = document.getElementById('resultSection');
    
    fetch(`${NETLIFY_FUNCTION_BASE_URL}/deezer-album/${albumId}`).then(r=>r.json()).then(album=>{
        lastAlbums[albumId] = album;
        results.innerHTML = `
            <div class="details-card">
                <img class="details-thumb" src="${album.cover_medium}" alt="album">
                <div class="details-title">${album.title}</div>
                <div class="details-artist">${album.artist.name}</div>
                <div class="details-year">${album.release_date?.slice(0,4) || ''}</div>
                <h3>Songs in this Album:</h3>
                <div style="display:flex; flex-wrap:wrap; gap:1.2rem; margin-top:1rem;">
                    ${album.tracks.data.map(t=>`
                        <div class="result-card" data-id="${t.id}">
                            <img class="result-thumb" src="${album.cover_medium}" alt="album">
                            <div class="result-title">${t.title}</div>
                            <div class="result-artist">${album.artist.name}</div>
                            <audio controls src="${t.preview}" style="width:90%"></audio>
                            <button class="btn" style="margin-top:7px;" onclick="event.stopPropagation();showSongDetails('${t.id}', ${albumId});">Details</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        Array.from(results.querySelectorAll('.result-card')).forEach(card=>{
            card.onclick = ()=>showSongDetails(card.getAttribute('data-id'));
        });
    });
}


function showSongDetails(songId, albumId) {
    let d = lastResults.find(x=>x.id==songId);
    if(!d && albumId && lastAlbums[albumId]) {
        d = lastAlbums[albumId].tracks.data.find(x=>x.id==songId);
        if(d && lastAlbums[albumId]) {
            d.album = lastAlbums[albumId];
            d.artist = lastAlbums[albumId].artist;
        }
    }
    if(!d) {
     
        fetch(`${NETLIFY_FUNCTION_BASE_URL}/deezer-track/${songId}`).then(r=>r.json()).then(d2=>renderDetails(d2));
    } else {
        renderDetails(d);
    }
    function renderDetails(d){
        currentSong = d;
        const details = document.getElementById('detailsSection');
        details.innerHTML = `<div style="margin:1.2rem 0;">Loading details...</div>`;
        Promise.all([
        
            fetch(`${NETLIFY_FUNCTION_BASE_URL}/${encodeURIComponent(d.artist.name)}/${encodeURIComponent(d.title)}`).then(r=>r.json()),
          
            fetch(`${NETLIFY_FUNCTION_BASE_URL}/deezer-artist/${d.artist.id}`).then(r=>r.json())
        ]).then(([lyricsData, artistData])=>{
            let lyric = lyricsData.lyrics || "Lyrics not found.";
            let favKey = makeFavKey(d);
            let isFav = favorites.some(f=>f.key===favKey);
            let tagKey = makeTagKey(d, lyric);
            let moods = moodTags[tagKey]||[];
            let lyricComments = comments[tagKey]||[];
            let bio = artistData?.name ? `${artistData.name} — ${artistData.nb_album} albums, ${artistData.nb_fan} fans` : "";
            details.innerHTML = `
                <div class="details-header">
                    <img class="details-thumb" src="${d.album.cover_medium}" alt="album">
                    <div class="details-info">
                        <div class="details-title">${d.title}</div>
                        <div class="details-artist">${d.artist.name}</div>
                        <div class="details-album">${d.album.title}</div>
                        <div class="details-year">${d.release_date?.slice(0,4) || ''}</div>
                        ${bio?`<div class="details-bio"><b>About Artist:</b> ${bio}</div>`:""}
                    </div>
                </div>
                <div class="audio-player">
                    <audio controls src="${d.preview}" preload="none"></audio>
                    <div class="audio-waveform"></div>
                </div>
                <div class="lyrics-block" id="lyricsBlock">${lyric.replace(/\n/g,'<br>')}</div>
                <div class="lyrics-actions">
                    <button class="copy" onclick="copyLyrics()">Copy</button>
                    <button class="favorite" onclick="toggleFavorite()">${isFav?"Remove Favorite":"Add to Favorites"}</button>
                    <button class="tag-mood" onclick="openMoodTagModal()">Tag Mood</button>
                    <button class="comment" onclick="openCommentModal()">💬 Comment</button>
                </div>
                <div class="moods-list" id="moodsList">${moods.map(m=>`<span class="mood-tag">${m}</span>`).join("")}</div>
                <div class="comments-list" id="commentsList">
                    ${lyricComments.map(c=>`<div><b>@${c.user}</b>: ${c.text}</div>`).join("")}
                </div>
            `;
            details.classList.remove('hidden');
        });
    }
}


function renderFavorites() {
    let el = document.getElementById('favorites');
    document.getElementById('favCount').textContent = favorites.length?`(${favorites.length})`:"";
    if(!favorites.length){ el.innerHTML = `<div style="color:#888;">No favorites yet.</div>`; return;}
    el.innerHTML = favorites.map(f=>`
        <div class="fav-item">
            <img class="fav-thumb" src="${f.cover}" alt="album">
            <div class="fav-title" style="cursor:pointer;color:var(--primary);" onclick="showFavoriteDetails('${f.key}')">${f.title}</div>
            <button class="fav-remove" onclick="removeFavorite('${f.key}')">🗑️</button>
        </div>
    `).join('');
}


window.showFavoriteDetails = function(key) {
    const f = favorites.find(x => x.key === key);
    if (!f) return;

    let d = {
        title: f.title,
        artist: { name: f.artist, id: "" }, 
        album: { title: f.album, cover_medium: f.cover },
        release_date: f.year,
        preview: f.preview || ""
    };
    currentSong = d;
    const details = document.getElementById('detailsSection');
    let lyric = f.lyric || "Lyrics not found.";
    let favKey = f.key;
    let isFav = true;
    let tagKey = makeTagKey(d, lyric);
    let moods = moodTags[tagKey]||[];
    let lyricComments = comments[tagKey]||[];
    details.innerHTML = `
        <div class="details-header">
            <img class="details-thumb" src="${f.cover}" alt="album">
            <div class="details-info">
                <div class="details-title">${f.title}</div>
                <div class="details-artist">${f.artist}</div>
                <div class="details-album">${f.album}</div>
                <div class="details-year">${f.year || ''}</div>
            </div>
        </div>
        <div class="audio-player">
            <audio controls src="${f.preview||""}" preload="none"></audio>
            <div class="audio-waveform"></div>
        </div>
        <div class="lyrics-block" id="lyricsBlock">${lyric.replace(/\n/g,'<br>')}</div>
        <div class="lyrics-actions">
            <button class="copy" onclick="copyLyrics()">Copy</button>
            <button class="favorite" onclick="toggleFavorite()">Remove Favorite</button>
            <button class="tag-mood" onclick="openMoodTagModal()">Tag Mood</button>
            <button class="comment" onclick="openCommentModal()">💬 Comment</button>
        </div>
        <div class="moods-list" id="moodsList">${moods.map(m=>`<span class="mood-tag">${m}</span>`).join("")}</div>
        <div class="comments-list" id="commentsList">
            ${lyricComments.map(c=>`<div><b>@${c.user}</b>: ${c.text}</div>`).join("")}
        </div>
    `;
    details.classList.remove('hidden');
};


function makeFavKey(d){ return `${d.title}__${d.artist.name||d.artist}__${d.album.title||d.album}`;}

function makeTagKey(d,lyrics){ return `${d.title}__${d.artist.name||d.artist}__${lyrics.substr(0,30)}`;}


window.toggleFavorite = function() {
    if(!currentSong)return;
    let lyrics = document.getElementById('lyricsBlock').textContent;
    let key = makeFavKey(currentSong);
    let idx = favorites.findIndex(f=>f.key===key);
    if(idx>=0){
        favorites.splice(idx,1);
        showToast("Removed from favorites");
    }else{
        favorites.push({
            key, title: currentSong.title, artist: currentSong.artist.name || currentSong.artist,
            album: currentSong.album.title || currentSong.album, cover: currentSong.album.cover_medium || currentSong.album.cover,
            lyric: document.getElementById('lyricsBlock').textContent,
            year: currentSong.release_date?.slice(0,4)||"",
            preview: currentSong.preview || ""
        });
        showToast("Added to favorites");
    }
    localStorage.setItem('lyricme_favorites', JSON.stringify(favorites));
    renderFavorites();
    if(document.querySelector('.lyrics-actions .favorite')) {
        document.querySelector('.lyrics-actions .favorite').textContent = idx>=0?"Add to Favorites":"Remove Favorite";
    }
};


window.removeFavorite = function(key) {
    favorites = favorites.filter(f=>f.key!==key);
    localStorage.setItem('lyricme_favorites', JSON.stringify(favorites));
    renderFavorites();
    showToast("Removed from favorites");
};


window.openMoodTagModal = function() {
    if(!currentSong)return;
    let lyrics = document.getElementById('lyricsBlock').textContent;
    let tagKey = makeTagKey(currentSong,lyrics);
    let moods = moodTags[tagKey]||[];
    openModal(`
        <h3>Tag Mood</h3>
        <div>Select all that apply:</div>
        <div style="display:flex;flex-wrap:wrap;gap:.5rem;">
            ${MOODS.map(m=>`<span class="mood-tag${moods.includes(m)?' selected':''}" onclick="toggleMoodTag(this,'${m}')">${m}</span>`).join("")}
        </div>
        <button class="btn" onclick="saveMoodTags('${tagKey}')">Save</button>
        <button class="btn cancel" onclick="closeModal()">Cancel</button>
    `);
};


window.toggleMoodTag = function(el, mood) {
    el.classList.toggle('selected');
};


window.saveMoodTags = function(tagKey) {
    let selected = Array.from(document.querySelectorAll('.mood-tag.selected')).map(el=>el.textContent);
    moodTags[tagKey] = selected;
    localStorage.setItem('lyricme_moodtags', JSON.stringify(moodTags));
    
    selected.forEach(mood=>{leaderboard[mood]=(leaderboard[mood]||0)+1;});
    localStorage.setItem('lyricme_leaderboard',JSON.stringify(leaderboard));
    closeModal();
    renderMoodCloud();
    if(document.getElementById('moodsList')) { 
        document.getElementById('moodsList').innerHTML = selected.map(m=>`<span class="mood-tag">${m}</span>`).join("");
    }
};


function renderMoodCloud(){
    let el = document.getElementById('moodCloud');
    let cloud={};
    Object.values(moodTags).forEach(arr=>arr.forEach(m=>cloud[m]=(cloud[m]||0)+1));
    let sorted = Object.entries(cloud).sort((a,b)=>b[1]-a[1]);
    el.innerHTML = sorted.length ? sorted.map(([mood,cnt])=>`<span class="mood-tag" style="font-size:${0.99+cnt*0.09}rem">${mood} (${cnt})</span>`).join("") : "<div>No tags yet.</div>";
}



window.openCommentModal = function() {
    if(!userProfile){ openProfileModal(); return;} 
    let lyrics = document.getElementById('lyricsBlock').textContent;
    let tagKey = makeTagKey(currentSong,lyrics);
    let lyricComments = comments[tagKey]||[];
    openModal(`
        <h3>Comments</h3>
        <div id="commentList">${lyricComments.map(c=>`<div><b>@${c.user}</b>: ${c.text}</div>`).join("")}</div>
        <form id="commentForm">
            <input type="text" id="commentInput" placeholder="Type a comment, tag with @username..." maxlength="120">
            <button type="submit" class="btn">Send</button>
        </form>
        <button class="btn cancel" onclick="closeModal()">Close</button>
    `);
    document.getElementById("commentForm").onsubmit = function(e){
        e.preventDefault();
        let text = document.getElementById("commentInput").value.trim();
        if(!text)return;
        let c = { user: userProfile.name, text };
        lyricComments.push(c);
        comments[tagKey] = lyricComments;
        localStorage.setItem('lyricme_comments', JSON.stringify(comments));
        document.getElementById("commentInput").value = "";
        document.getElementById("commentList").innerHTML = lyricComments.map(c=>`<div><b>@${c.user}</b>: ${c.text}</div>`).join("");
    };
};


function renderProfileBtn() {
    const el = document.getElementById('profileBtn');
    if(!userProfile){
        el.innerHTML = `<span>👤 Profile</span>`;
    }else{
        el.innerHTML = `<img src="${userProfile.avatar}" alt="avatar"> <span>${userProfile.name}</span>`;
    }
}


function openProfileModal() {
    openModal(`
        <h2>${userProfile?"Edit":"Create"} Profile</h2>
        <form id="profileForm">
            <label>Name:<br><input type="text" id="profileName" value="${userProfile?userProfile.name:""}" required></label><br>
            <label>Avatar:<br><input type="file" id="profileAvatar" accept="image/*"></label><br>
            <img id="profileAvatarImg" src="${userProfile?.avatar || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'}" alt="avatar">
            <button type="submit" class="btn">${userProfile?"Update":"Create"}</button>
            <button type="button" class="btn cancel" id="profileCancel">Cancel</button>
        </form>
    `);
    document.getElementById("profileForm").onsubmit = (e) => {
        e.preventDefault();
        const name = document.getElementById("profileName").value.trim();
        const file = document.getElementById("profileAvatar").files[0];
        if(file){
            const reader = new FileReader();
            reader.onload = () => { saveProfile({name, avatar: reader.result}); };
            reader.readAsDataURL(file);
        }else{
            saveProfile({name, avatar: userProfile?.avatar || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'});
        }
    };
    document.getElementById("profileCancel").onclick = closeModal;
    document.getElementById("profileAvatar").onchange = function(){
        const file = this.files[0];
        if(file){
            const reader = new FileReader();
            reader.onload = () => { document.getElementById("profileAvatarImg").src = reader.result; };
            reader.readAsDataURL(file);
        }
    };
}