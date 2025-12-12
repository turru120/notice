document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소 참조
    const feedContainer = document.getElementById('announcements-feed-container');
    const paginationContainer = document.getElementById('pagination-container');
    const refreshBtn = document.getElementById('refresh-btn');

    let allAnnouncements = [];
    let currentPage = 1;
    const itemsPerPage = 10;
    let lastKnownTimestamp = 0;


    // 모든 공지사항을 비동기적으로 불러와 처리
    async function fetchAllAnnouncements() {
        if (!feedContainer) {
            console.error('필수 DOM 요소(feedContainer)가 없어 공지사항을 불러올 수 없습니다.');
            return [];
        }
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
            feedContainer.innerHTML = `<p class="text-center text-danger">공지사항을 불러오는데 실패했습니다: ${error.message}</p>`;
            return [];
        }
    }

    // 공지사항 목록을 UI에 렌더링
    function renderFeed(announcements, page) {
        if (!feedContainer) {
            console.error('필수 DOM 요소(feedContainer)가 없어 공지사항 목록을 렌더링할 수 없습니다.');
            return;
        }
        if (!announcements || announcements.length === 0) {
            feedContainer.innerHTML = '<p class="text-center text-muted">새로운 공지사항이 없습니다.</p>';
            return;
        }

        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedAnnouncements = announcements.slice(startIndex, endIndex);

        // 달력에 이미 추가된 일정 ID 목록 가져오기
        let calendarSchedules;
        try {
            const storedSchedules = localStorage.getItem(getCalendarKey());
            calendarSchedules = storedSchedules ? JSON.parse(storedSchedules) : [];
        } catch (e) {
            console.error('로컬 스토리지의 일정 데이터 파싱 오류:', e);
            localStorage.removeItem(getCalendarKey());
            calendarSchedules = [];
        }
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

    // 공지사항을 달력 일정에 추가
    function addToCalendar(announcementId) {
        const announcementToAdd = allAnnouncements.find(ann => ann.id === announcementId);
        if (!announcementToAdd) return;

        const calendarKey = getCalendarKey();
        let calendarSchedules;
        try {
            const storedSchedules = localStorage.getItem(calendarKey);
            calendarSchedules = storedSchedules ? JSON.parse(storedSchedules) : [];
        } catch (e) {
            console.error('로컬 스토리지의 일정 데이터 파싱 오류:', e);
            localStorage.removeItem(calendarKey);
            calendarSchedules = [];
        }

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
        renderPagination(paginationContainer, announcements.length, currentPage, itemsPerPage);
    }

    // 새로고침 및 스크래퍼 실행
    async function handleRefreshAndScrape() {
        if (!refreshBtn) {
            console.error('필수 DOM 요소(refreshBtn)가 없어 새로고침 및 스크래퍼를 실행할 수 없습니다.');
            return;
        }
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

    if (refreshBtn) {
        refreshBtn.addEventListener('click', handleRefreshAndScrape);
    }

    if (feedContainer) {
        feedContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-to-calendar-btn')) {
                e.preventDefault();
                e.stopPropagation();
                const announcementId = Number(e.target.dataset.id);
                addToCalendar(announcementId);
            }
        });
    }

    if (paginationContainer) {
        paginationContainer.addEventListener('click', (e) => {
            e.preventDefault();
            if (e.target.tagName === 'A' && e.target.dataset.page) {
                const page = parseInt(e.target.dataset.page, 10);
                if (page >= 1 && page <= Math.ceil(allAnnouncements.length / itemsPerPage)) {
                    currentPage = page;
                    renderFeed(allAnnouncements, currentPage);
                    renderPagination(paginationContainer, allAnnouncements.length, currentPage, itemsPerPage);
                }
            }
        });
    }

    initialize();
});