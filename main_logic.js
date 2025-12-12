document.addEventListener('DOMContentLoaded', () => {
    // [수정] 일정 -> 공지로 명칭 통일 - 사용자 혼동 방지
    let allNotices = [];
    let currentDate = new Date();
    let currentNoticeId = null;

    // DOM 요소 참조 (주요 UI 컴포넌트)
    const calendarContainer = document.getElementById('calendar-container');
    const noticeListContainer = document.getElementById('notice-list-container');
    const searchCategorySelect = document.getElementById('search-category');
    const searchPrioritySelect = document.getElementById('search-priority');
    const searchKeywordInput = document.getElementById('search-keyword');
    const searchBtn = document.getElementById('search-btn');
    const yearInput = document.getElementById('year-input');
    const monthInput = document.getElementById('month-input');
    const renderBtn = document.getElementById('render-calendar-btn');

    // 공지 추가 모달 관련 요소
    const addModalEl = document.getElementById('notice-modal');
    const addModalInstance = addModalEl ? new bootstrap.Modal(addModalEl) : null;
    const noticeForm = document.getElementById('notice-form');
    const noticeDateInput = document.getElementById('notice-date');
    const noticeTitleInput = document.getElementById('notice-title');
    const noticeContentInput = document.getElementById('notice-content');
    const noticeCategoryInput = document.getElementById('notice-category');
    const noticePrioritySelect = document.getElementById('notice-priority');
    const cancelAddModalBtn = document.getElementById('cancel-modal-btn');

    // 공지 상세/수정 모달 관련 요소
    const detailsModalEl = document.getElementById('details-modal');
    const detailsModalInstance = detailsModalEl ? new bootstrap.Modal(detailsModalEl) : null;
    const detailsIdInput = document.getElementById('details-id');
    const detailsEditDateInput = document.getElementById('details-edit-date');
    const detailsEditTitleInput = document.getElementById('details-edit-title');
    const detailsEditContentInput = document.getElementById('details-edit-content');
    const detailsEditCategorySelect = document.getElementById('details-edit-category');
    const detailsEditPrioritySelect = document.getElementById('details-edit-priority');
    const deleteNoticeBtn = document.getElementById('delete-notice-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const updateNoticeBtn = document.getElementById('update-notice-btn');

    // 로컬 스토리지에서 공지 불러옴
    async function fetchAnnouncements() {
        const storedNotices = localStorage.getItem(getCalendarKey());
        try {
            return storedNotices ? JSON.parse(storedNotices) : [];
        } catch (e) {
            console.error('로컬 스토리지의 공지 데이터 파싱 오류:', e);
            localStorage.removeItem(getCalendarKey());
            return [];
        }
    }

    // 드롭다운에 카테고리 옵션 채움
    function populateCategoryDropdowns() {
        const storedCategories = localStorage.getItem(getCategoriesKey());
        let categories;
        try {
            categories = storedCategories ? JSON.parse(storedCategories) : ['수업', '장학', '행사', '기타']; //기본 카테고리
        } catch (e) {
            console.error('로컬 스토리지의 카테고리 데이터 파싱 오류:', e);
            localStorage.removeItem(getCategoriesKey());
            categories = ['수업', '장학', '행사', '기타'];
        }

        // 검색 카테고리 드롭다운 업데이트
        if (searchCategorySelect) {
            searchCategorySelect.innerHTML = '<option value="">전체</option>';
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                searchCategorySelect.appendChild(option);
            });
        }

        // 공지 추가/수정 모달의 카테고리 드롭다운 업데이트
        const dropdowns = [];
        if (noticeCategoryInput) dropdowns.push(noticeCategoryInput);
        if (detailsEditCategorySelect) dropdowns.push(detailsEditCategorySelect);

        dropdowns.forEach(dropdown => {
            dropdown.innerHTML = '<option value="" disabled selected>분류 선택</option>';
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                dropdown.appendChild(option);
            });
        });
    }

    // 공지 요소를 생성하여 반환
    function createNoticeElement(notice, isHighlighted) {
        const noticeItem = document.createElement('div');
        noticeItem.className = 'notice-item';
        noticeItem.dataset.id = notice.id;
        noticeItem.textContent = notice.title;

        // 하이라이트 여부
        if (isHighlighted) {
            noticeItem.style.backgroundColor = notice.color;
            noticeItem.style.color = 'white';
        } else {
            noticeItem.style.border = `2px solid ${notice.color}`;
            noticeItem.style.backgroundColor = 'white';
            noticeItem.style.color = '#333';
        }
        return noticeItem;
    }

    // 달력을 렌더링하고 해당 월의 공지를 표시
    function renderCalendar(date, noticesToRender, searchResultsToHighlight = []) {
        if (!yearInput || !monthInput || !calendarContainer) {
            console.error('필수 DOM 요소(yearInput, monthInput, calendarContainer)가 없어 달력을 렌더링할 수 없습니다.');
            return;
        }

        const year = date.getFullYear();
        const month = date.getMonth();
        yearInput.value = year;
        monthInput.value = month + 1;

        calendarContainer.innerHTML = '';

        const table = document.createElement('table');
        table.className = 'table table-bordered';

        const thead = table.createTHead();
        thead.className = 'blue-header';
        const headerRow = thead.insertRow();
        ['일', '월', '화', '수', '목', '금', '토'].forEach(day => {
            const th = document.createElement('th');
            th.textContent = day;
            headerRow.appendChild(th);
        });

        const tbody = table.createTBody();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let day = 1;

        // 달력 날짜 채우기
        for (let i = 0; i < 6; i++) {
            const row = tbody.insertRow();
            for (let j = 0; j < 7; j++) {
                const cell = row.insertCell();
                if ((i === 0 && j < firstDay) || day > daysInMonth) {
                    cell.className = 'other-month';
                } else {
                    const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const today = new Date();
                    cell.dataset.date = fullDate;
                    if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
                        cell.classList.add('today');
                    }

                    const dayDiv = document.createElement('div');
                    dayDiv.textContent = day;
                    cell.appendChild(dayDiv);

                    // 해당 날짜의 공지 표시
                    noticesToRender.forEach(notice => {
                        if (notice.date === fullDate) {
                            const isHighlighted = searchResultsToHighlight.some(hn => hn.id === notice.id);
                            const noticeElement = createNoticeElement(notice, isHighlighted);
                            cell.appendChild(noticeElement);
                        }
                    });
                    day++;
                }
            }
            if (day > daysInMonth) break;
        }
        calendarContainer.appendChild(table);
    }

    function renderNoticeList(noticesToRender, highlightedNotices = []) {
        if (!noticeListContainer) {
            console.error('필수 DOM 요소(noticeListContainer)가 없어 공지 목록을 렌더링할 수 없습니다.');
            return;
        }
        let listHtml = `<table class="table table-hover" style="font-size: 0.9rem;"><thead class="blue-header"><tr><th>날짜</th><th>분류</th><th>제목</th><th>중요도</th></tr></thead><tbody>`;
        if (noticesToRender.length === 0) {
            listHtml += '<tr><td colspan="4" class="text-center text-muted">해당하는 공지가 없습니다.</td></tr>';
        } else {
            noticesToRender.forEach(n => {
                const isHighlighted = highlightedNotices.length > 0 && highlightedNotices.some(hn => hn.id === n.id);
                const style = isHighlighted ? `style="background-color: ${n.color}; color: white;"` : '';
                const date = new Date(n.date);
                const formattedDate = `${String(date.getFullYear()).substring(2)}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
                listHtml += `<tr data-id="${n.id}" style="cursor: pointer;"><td>${formattedDate}</td><td>${n.category || '미지정'}</td><td>${n.title}</td><td>${n.priority || '보통'}</td></tr>`;
            });
        }
        listHtml += '</tbody></table>';
        noticeListContainer.innerHTML = listHtml;
    }

    // 현재 월의 달력과 공지 목록을 모두 렌더링
    function renderAll() {
        let currentMonthNotices = allNotices.filter(n =>
            new Date(n.date).getFullYear() === currentDate.getFullYear() &&
            new Date(n.date).getMonth() === currentDate.getMonth()
        );

        // [수정] 공지 목록 날짜 내림차순 -> 중요도 내림차순으로 정렬 - 사용자 편의성
        const priorityOrder = { '높음': 3, '보통': 2, '낮음': 1 };
        currentMonthNotices.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);

            if (dateA - dateB !== 0) {
                return dateA - dateB;
            }

            const priorityA = priorityOrder[a.priority] || 2;
            const priorityB = priorityOrder[b.priority] || 2;
            return priorityB - priorityA;
        });

        renderCalendar(currentDate, currentMonthNotices);
        renderNoticeList(currentMonthNotices);
    }

    // 검색 조건에 따라 공지를 필터링하고 화면을 다시 렌더링
    function handleSearch() {
        if (!searchCategorySelect || !searchPrioritySelect || !searchKeywordInput) {
            console.error('필수 DOM 요소(searchCategorySelect, searchPrioritySelect, searchKeywordInput)가 없어 검색 기능을 수행할 수 없습니다.');
            return;
        }
        const category = searchCategorySelect.value;
        const priority = searchPrioritySelect.value;
        const keyword = searchKeywordInput.value.toLowerCase();

        const currentMonthNotices = allNotices.filter(n =>
            new Date(n.date).getFullYear() === currentDate.getFullYear() &&
            new Date(n.date).getMonth() === currentDate.getMonth()
        );

        const isSearching = category || priority || keyword;

        if (!isSearching) {
            renderAll();
            return;
        }

        // 검색 조건에 맞는 공지 필터링
        const filteredNotices = currentMonthNotices.filter(n => {
            const categoryMatch = !category || (n.category || '미지정') === category;
            const priorityMatch = !priority || (n.priority || '보통') === priority;
            const keywordMatch = !keyword || n.title.toLowerCase().includes(keyword) || (n.content && n.content.toLowerCase().includes(keyword));
            return categoryMatch && priorityMatch && keywordMatch;
        });

        // [추가] 검색 결과 공지 목록 날짜 및 중요도 순으로 정렬 - 사용자 편의성
        const priorityOrder = { '높음': 3, '보통': 2, '낮음': 1 };
        filteredNotices.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);

            if (dateA - dateB !== 0) {
                return dateA - dateB;
            }

            const priorityA = priorityOrder[a.priority] || 2;
            const priorityB = priorityOrder[b.priority] || 2;
            return priorityB - priorityA;
        });

        // 필터링된 공지를 하이라이트 대상으로 지정하여 캘린더 재렌더링
        renderCalendar(currentDate, currentMonthNotices, filteredNotices);
        renderNoticeList(filteredNotices);
    }

    // 공지 추가 모달 열기
    function openAddModal(date) {
        if (!noticeForm || !noticeDateInput || !addModalInstance || !addModalEl || !noticeTitleInput) {
            console.error('필수 DOM 요소(noticeForm, noticeDateInput, addModalInstance, addModalEl, noticeTitleInput)가 없어 공지 추가 모달을 열 수 없습니다.');
            return;
        }
        noticeForm.reset();
        noticeDateInput.value = date;
        addModalInstance.show();
    }

    // 공지 추가 모달 닫기
    function closeAddModal() {
        if (!noticeForm || !addModalInstance) {
            console.error('필수 DOM 요소(noticeForm, addModalInstance)가 없어 공지 추가 모달을 닫을 수 없습니다.');
            return;
        }
        noticeForm.reset();
        addModalInstance.hide();
    }

    // 새 공지를 추가하고 로컬 스토리지에 저장
    function addNotice(e) {
        e.preventDefault();
        if (!noticeCategoryInput || !noticeDateInput || !noticeTitleInput || !noticeContentInput || !noticePrioritySelect) {
            console.error('필수 DOM 요소(noticeCategoryInput, noticeDateInput, noticeTitleInput, noticeContentInput, noticePrioritySelect)가 없어 공지를 추가할 수 없습니다.');
            return;
        }
        if (!noticeCategoryInput.value) {
            alert('분류를 선택해주세요.');
            return;
        }
        const newNotice = {
            id: Date.now(),
            date: noticeDateInput.value,
            title: noticeTitleInput.value,
            content: noticeContentInput.value,
            category: noticeCategoryInput.value,
            priority: noticePrioritySelect.value,
            site: '사용자 추가',
            color: '#6c757d'
        };
        allNotices.push(newNotice);
        localStorage.setItem(getCalendarKey(), JSON.stringify(allNotices));
        closeAddModal();
        renderAll();
    }

    // 공지 상세/수정 모달 열기
    function openDetailsModal(id) {
        if (!detailsIdInput || !detailsEditDateInput || !detailsEditTitleInput || !detailsEditContentInput || !detailsEditCategorySelect || !detailsEditPrioritySelect || !detailsModalInstance) {
            console.error('필수 DOM 요소(detailsIdInput, detailsEditDateInput, detailsEditTitleInput, detailsEditContentInput, detailsEditCategorySelect, detailsEditPrioritySelect, detailsModalInstance)가 없어 공지 상세/수정 모달을 열 수 없습니다.');
            return;
        }

        const notice = allNotices.find(n => n.id === id);
        if (notice) {
            currentNoticeId = id;
            detailsIdInput.value = notice.id;
            detailsEditDateInput.value = notice.date;
            detailsEditTitleInput.value = notice.title;
            detailsEditContentInput.value = notice.content || '';
            detailsEditCategorySelect.value = notice.category || '';
            detailsEditPrioritySelect.value = notice.priority || '보통';
            detailsModalInstance.show();
        }
    }

    // 공지 상세/수정 모달 닫기
    function closeDetailsModal() {
        if (!detailsModalInstance) {
            console.error('필수 DOM 요소(detailsModalInstance)가 없어 공지 상세/수정 모달을 닫을 수 없습니다.');
            return;
        }
        detailsModalInstance.hide();
    }

    // 기존 공지 업데이트하고 로컬 스토리지에 저장
    function updateNotice() {
        if (!detailsEditCategorySelect || !detailsEditDateInput || !detailsEditTitleInput || !detailsEditContentInput || !detailsEditPrioritySelect) {
            console.error('필수 DOM 요소(detailsEditCategorySelect, detailsEditDateInput, detailsEditTitleInput, detailsEditContentInput, detailsEditPrioritySelect)가 없어 공지를 업데이트할 수 없습니다.');
            return;
        }
        if (!detailsEditCategorySelect.value) {
            alert('분류를 선택해주세요.');
            return;
        }
        const noticeToUpdateId = Number(detailsIdInput.value);
        const noticeIndex = allNotices.findIndex(n => n.id === noticeToUpdateId);
        if (noticeIndex > -1) {
            allNotices[noticeIndex] = {
                ...allNotices[noticeIndex],
                date: detailsEditDateInput.value,
                title: detailsEditTitleInput.value,
                content: detailsEditContentInput.value,
                category: detailsEditCategorySelect.value,
                priority: detailsEditPrioritySelect.value
            };
            localStorage.setItem(getCalendarKey(), JSON.stringify(allNotices));
            closeDetailsModal();
            renderAll();
        }
    }

    // 공지를 삭제하고 로컬 스토리지에 저장
    function deleteNotice() {
        if (confirm('정말로 이 공지를 삭제하시겠습니까?')) {
            const noticeToDeleteId = Number(detailsIdInput.value);
            allNotices = allNotices.filter(n => n.id !== noticeToDeleteId);
            localStorage.setItem(getCalendarKey(), JSON.stringify(allNotices));
            closeDetailsModal();
            renderAll();
        }
    }

    if (renderBtn) renderBtn.addEventListener('click', () => {
        const year = parseInt(yearInput.value);
        const month = parseInt(monthInput.value) - 1;
        if (!isNaN(year) && !isNaN(month)) {
            currentDate = new Date(year, month);
            renderAll();
        }
    });

    if (searchBtn) searchBtn.addEventListener('click', handleSearch);
    if (searchKeywordInput) searchKeywordInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') handleSearch(); });

    if (calendarContainer) calendarContainer.addEventListener('click', (e) => {
        const noticeItem = e.target.closest('.notice-item');
        const cell = e.target.closest('td[data-date]');
        if (noticeItem) {
            e.stopPropagation();
            const noticeId = Number(noticeItem.dataset.id);
            openDetailsModal(noticeId);
        } else if (cell && !cell.classList.contains('other-month')) {
            openAddModal(cell.dataset.date);
        }
    });

    if (noticeListContainer) noticeListContainer.addEventListener('click', (e) => {
        const row = e.target.closest('tr[data-id]');
        if (row) {
            const noticeId = Number(row.dataset.id);
            openDetailsModal(noticeId);
        }
    });

    if (noticeForm) noticeForm.addEventListener('submit', addNotice);
    if (deleteNoticeBtn) deleteNoticeBtn.addEventListener('click', deleteNotice);
    if (updateNoticeBtn) updateNoticeBtn.addEventListener('click', updateNotice);

    if (addModalEl) {
        addModalEl.addEventListener('shown.bs.modal', () => noticeTitleInput.focus());
    }

    window.addEventListener('storage', (e) => {
        if (e.key === getCategoriesKey()) {
            populateCategoryDropdowns();
        }
        if (e.key === getCalendarKey()) {
            initialize();
        }
    });

    async function initialize() {
        // 저장된 모든 공지를 불러오고 화면 구성
        allNotices = await fetchAnnouncements();
        populateCategoryDropdowns();

        yearInput.value = currentDate.getFullYear();
        monthInput.value = currentDate.getMonth() + 1;

        renderAll();
    }

    initialize();
});