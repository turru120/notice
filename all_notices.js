document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소 참조
    const feedContainer = document.getElementById('announcements-feed-container');
    const paginationContainer = document.getElementById('pagination-container');
    const refreshBtn = document.getElementById('refresh-btn');

    let allAnnouncements = [];
    let currentPage = 1;
    const itemsPerPage = 10;

    function getCalendarKey() {
        const userId = localStorage.getItem('current_user_id');
        return `calendar_schedules_${userId || 'guest'}`;
    }

    // 모든 공지사항을 비동기적으로 불러와 처리
    async function fetchAllAnnouncements() {
        feedContainer.innerHTML = '<p class="text-center text-muted">공지사항 불러오는 중</p>';

        try {
            const userId = localStorage.getItem('current_user_id');
            if (!userId) throw new Error("로그인 정보가 없습니다. 다시 로그인해주세요.");

            // 사용자가 등록한 사이트 정보 불러오기
            const sitesResponse = await fetch(`get_sites.php?user_id=${userId}&t=${new Date().getTime()}`);
            if (!sitesResponse.ok) {
                throw new Error(`사이트 정보를 불러오는데 실패했습니다: ${sitesResponse.status}`);
            }
            const user = await sitesResponse.json();
            const sites = user.registered_sites || [];
            const colorMap = new Map(sites.map(site => [site.site_name, site.color]));
            const subscribedSiteNames = new Set(sites.map(site => site.site_name));

            // 공지사항 데이터 불러오기
            const noticesResponse = await fetch('notices.json?t=' + new Date().getTime());
            if (!noticesResponse.ok) {
                throw new Error(`공지사항 목록을 불러오는데 실패했습니다: ${noticesResponse.status}`);
            }
            const noticeData = await noticesResponse.json();
            const filteredData = noticeData.filter(item => subscribedSiteNames.has(item.site));
            const processedData = filteredData.map(item => ({
                ...item,
                color: colorMap.get(item.site) || '#6c757d'
            }));

            allAnnouncements = processedData;
            return allAnnouncements;

        } catch (error) {
            feedContainer.innerHTML = `<p class="text-center text-danger">공지사항을 불러오는데 실패했습니다: ${error.message}</p>`; // 에러 메시지 표시
            return [];
        }
    }

    // 공지사항 목록을 UI에 렌더링
    function renderFeed(announcements, page) {
        feedContainer.innerHTML = '';
        if (!announcements || announcements.length === 0) {
            feedContainer.innerHTML = '<p class="text-center text-muted">새로운 공지사항이 없습니다.</p>';
            return;
        }

        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedAnnouncements = announcements.slice(startIndex, endIndex);

        // 달력에 이미 추가된 일정 ID 목록 가져오기
        const calendarSchedules = JSON.parse(localStorage.getItem(getCalendarKey())) || [];
        const calendarScheduleIds = new Set(calendarSchedules.map(s => s.id));

        // 공지사항 카드 생성
        const feedHtml = paginatedAnnouncements.map(ann => {
            const isAdded = calendarScheduleIds.has(ann.id);
            return `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <h5 class="card-title"><a href="${ann.notice_url}" target="_blank" class="text-decoration-none text-body">${ann.title}</a></h5>
                            <button class="btn btn-sm ${isAdded ? 'btn-success' : 'btn-primary'} add-to-calendar-btn" data-id="${ann.id}" ${isAdded ? 'disabled' : ''}>
                                ${isAdded ? '추가됨' : '달력에 추가'}
                            </button>
                        </div>
                        <h6 class="card-subtitle mb-2 text-muted" style="color: ${ann.color} !important;">
                            ${ann.site}
                        </h6>
                        <p class="card-text">
                            <small class="text-muted">날짜: ${ann.date}</small>
                        </p>
                    </div>
                </div>
            `;
        }).join('');

        feedContainer.innerHTML = feedHtml;
    }

    // 페이지네이션 컨트롤을 UI에 렌더링
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

        let paginationHtml = '<ul class="pagination justify-content-center">';
        paginationHtml += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${currentPage - 1}">&lt;</a></li>`;

        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
        }

        paginationHtml += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${currentPage + 1}">&gt;</a></li>`;
        paginationHtml += '</ul>';
        paginationContainer.innerHTML = paginationHtml;
    }

    // 공지사항을 달력 일정에 추가
    function addToCalendar(announcementId) {
        const announcementToAdd = allAnnouncements.find(ann => ann.id === announcementId);
        if (!announcementToAdd) return;

        const calendarKey = getCalendarKey();
        const calendarSchedules = JSON.parse(localStorage.getItem(calendarKey)) || [];

        if (calendarSchedules.some(s => s.id === announcementId)) {
            alert('이미 달력에 추가된 항목입니다.');
            return;
        }

        calendarSchedules.push(announcementToAdd);
        localStorage.setItem(calendarKey, JSON.stringify(calendarSchedules));

        const button = document.querySelector(`.add-to-calendar-btn[data-id="${announcementId}"]`);
        if (button) {
            button.textContent = '추가됨';
            button.classList.remove('btn-primary');
            button.classList.add('btn-success');
            button.disabled = true;
        }
    }

    // 공지사항을 불러오고 UI 렌더링
    async function initialize() {
        currentPage = 1;
        const announcements = await fetchAllAnnouncements();
        renderFeed(announcements, currentPage);
        renderPagination(announcements.length);
    }

    // 새로고침 및 스크래퍼 실행
    async function handleRefreshAndScrape() {
        const originalButtonText = refreshBtn.textContent;
        refreshBtn.disabled = true;
        //[추가] 스크랩 중 버튼 텍스트 '스크랩 중'으로 변경 - 사용자 이해도 향상
        refreshBtn.textContent = '스크랩 중';

        try {
            const response = await fetch('run_scraper.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Scraper failed with status: ${response.status}`);
            }

            const result = await response.json();

            await initialize();

        } catch (error) {
            alert('스크래퍼 실행 또는 데이터 로딩 중 오류가 발생했습니다.');
        } finally {
            refreshBtn.disabled = false;
            refreshBtn.textContent = originalButtonText;
        }
    }

    refreshBtn.addEventListener('click', handleRefreshAndScrape);

    feedContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-to-calendar-btn')) {
            e.preventDefault();
            e.stopPropagation();
            const announcementId = Number(e.target.dataset.id);
            addToCalendar(announcementId);
        }
    });

    paginationContainer.addEventListener('click', (e) => {
        e.preventDefault();
        if (e.target.tagName === 'A' && e.target.dataset.page) {
            const page = parseInt(e.target.dataset.page, 10);
            if (page >= 1 && page <= Math.ceil(allAnnouncements.length / itemsPerPage)) {
                currentPage = page;
                renderFeed(allAnnouncements, currentPage);
                renderPagination(allAnnouncements.length);
            }
        }
    });

    initialize();
});