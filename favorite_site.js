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
        announcementsListEl.innerHTML = '';
        if (!allAnnouncementsForSite || allAnnouncementsForSite.length === 0) {
            announcementsListEl.innerHTML = '<p class="text-center text-muted">이 사이트에 대한 공지사항이 없습니다.</p>';
            return;
        }

        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedAnnouncements = allAnnouncementsForSite.slice(startIndex, endIndex);

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

    function renderPagination(totalItems) {
        paginationContainer.innerHTML = '';
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if (totalPages <= 1) return;

        // [보완] 페이지네이션 바에 페이지 번호 수 표시되는 방식 변경 - 사용자 편의성 향상
        // 페이지네이션 바에 한 번에 표시될 최대 페이지 번호 수 10-> 5로 줄이고, 현재 페이지를 중심으로 총 5개 표시
        const maxPageNumbers = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxPageNumbers / 2));
        let endPage = Math.min(totalPages, startPage + maxPageNumbers - 1);

        if (endPage - startPage + 1 < maxPageNumbers) {
            startPage = Math.max(1, endPage - maxPageNumbers + 1);
        }

        let paginationHtml = `<ul class="pagination justify-content-center">`;
        paginationHtml += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage - 1}">&lt;</a>
            </li>
        `;
        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }
        paginationHtml += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage + 1}">&gt;</a>
            </li>
        `;
        paginationHtml += `</ul>`;
        paginationContainer.innerHTML = paginationHtml;
    }

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

            siteTitleEl.textContent = `선택한 홈페이지 : ${currentSite.site_name}`;

            const noticesResponse = await fetch('notices.json?t=' + new Date().getTime());
            if (!noticesResponse.ok) throw new Error('공지사항 데이터를 불러오는 데 실패했습니다.');
            const allNotices = await noticesResponse.json();

            allAnnouncementsForSite = allNotices.filter(notice => notice.site === currentSite.site_name);

            renderFeed(currentPage);
            renderPagination(allAnnouncementsForSite.length);

        } catch (error) {
            siteTitleEl.textContent = '오류';
            announcementsListEl.innerHTML = `<p class="text-center text-danger">${error.message}</p>`;
        }
    }

    paginationContainer.addEventListener('click', (e) => {
        e.preventDefault();
        if (e.target.tagName === 'A' && e.target.dataset.page) {
            const page = parseInt(e.target.dataset.page, 10);
            if (page >= 1 && page <= Math.ceil(allAnnouncementsForSite.length / itemsPerPage)) {
                currentPage = page;
                renderFeed(currentPage);
                renderPagination(allAnnouncementsForSite.length);
            }
        }
    });

    initialize();
});