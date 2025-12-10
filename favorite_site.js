document.addEventListener('DOMContentLoaded', () => {
    const siteTitleEl = document.getElementById('site-title');
    const announcementsListEl = document.getElementById('announcements-list');

    let paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'pagination-container';
        announcementsListEl.parentNode.insertBefore(paginationContainer, announcementsListEl.nextSibling);
    }

    let allAnnouncementsForSite = [];
    let currentPage = 1;
    const itemsPerPage = 10;

    function renderFeed(page) {
        if (!announcementsListEl) {
            console.error('필수 DOM 요소(announcementsListEl)가 없어 공지사항 목록을 렌더링할 수 없습니다.');
            return;
        }
        announcementsListEl.innerHTML = '';
        if (!allAnnouncementsForSite || allAnnouncementsForSite.length === 0) {
            announcementsListEl.innerHTML = '<p class="text-center text-muted">이 사이트에 대한 공지사항이 없습니다.</p>';
            return;
        }

        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedAnnouncements = allAnnouncementsForSite.slice(startIndex, endIndex);

        // 공지사항 카드를 생성해 목록에 추가
        const feedHtml = paginatedAnnouncements.map(ann => `
            <div class="card mb-3">
                <div class="card-body">
                    <h5 class="card-title"><a href="${ann.notice_url}" target="_blank" class="text-decoration-none text-body">${ann.title}</a></h5>
                    <p class="card-text">
                        <small class="text-muted">날짜: ${ann.date}</small>
                    </p>
                </div>
            </div>
        `).join('');

        announcementsListEl.innerHTML = feedHtml;
    }

    // URL에서 site ID를 가져와 해당 사이트의 공지사항을 로드 및 렌더링
    async function initialize() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const siteId = Number(urlParams.get('id'));
            if (!siteId) throw new Error('URL에 site ID가 지정되지 않았습니다.');

            const userId = localStorage.getItem('current_user_id');
            if (!userId) throw new Error('로그인 정보가 없습니다.');

            const sitesResponse = await fetch(`get_sites.php?user_id=${userId}&t=${new Date().getTime()}`);
            if (!sitesResponse.ok) throw new Error('사이트 정보를 불러오는 데 실패했습니다.');

            const user = await sitesResponse.json();
            const currentSite = (user.registered_sites || []).find(site => site.id === siteId);
            if (!currentSite) throw new Error('주어진 ID에 해당하는 사이트를 찾을 수 없습니다.');

            if (siteTitleEl) {
                siteTitleEl.textContent = `선택한 홈페이지 : ${currentSite.site_name}`;
            }

            const noticesResponse = await fetch('notices.json?t=' + new Date().getTime());
            if (!noticesResponse.ok) throw new Error('공지사항 데이터를 불러오는 데 실패했습니다.');
            const allNotices = await noticesResponse.json();

            // 현재 사이트에 해당하는 공지사항만 필터링
            allAnnouncementsForSite = allNotices.filter(notice => notice.site === currentSite.site_name);

            renderFeed(currentPage);
            renderPagination(paginationContainer, allAnnouncementsForSite.length, currentPage, itemsPerPage);

        } catch (error) {
            if (siteTitleEl) {
                siteTitleEl.textContent = '오류';
            }
            if (announcementsListEl) {
                announcementsListEl.innerHTML = `<p class="text-center text-danger">${error.message}</p>`;
            } else {
                console.error('필수 DOM 요소(announcementsListEl)가 없어 에러 메시지를 표시할 수 없습니다.', error);
            }
        }
    }

    paginationContainer.addEventListener('click', (e) => {
        e.preventDefault();
        if (e.target.tagName === 'A' && e.target.dataset.page) {
            const page = parseInt(e.target.dataset.page, 10);
            if (page >= 1 && page <= Math.ceil(allAnnouncementsForSite.length / itemsPerPage)) {
                currentPage = page;
                renderFeed(currentPage);
                renderPagination(paginationContainer, allAnnouncementsForSite.length, currentPage, itemsPerPage);
            }
        }
    });

    initialize();
});