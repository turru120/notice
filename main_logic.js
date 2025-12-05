document.addEventListener('DOMContentLoaded', () => {
    let allSchedules = [];
    let currentDate = new Date();
    let currentScheduleId = null;

    function getCalendarKey() {
        const userId = localStorage.getItem('current_user_id');
        return `calendar_schedules_${userId || 'guest'}`;
    }

    function getCategoriesKey() {
        const userId = localStorage.getItem('current_user_id');
        return `managed_categories_${userId || 'guest'}`;
    }

    // DOM 요소 참조 (주요 UI 컴포넌트)
    const calendarContainer = document.getElementById('calendar-container');
    const scheduleListContainer = document.getElementById('schedule-list-container');
    const searchCategorySelect = document.getElementById('search-category');
    const searchPrioritySelect = document.getElementById('search-priority');
    const searchKeywordInput = document.getElementById('search-keyword');
    const searchBtn = document.getElementById('search-btn');
    const yearInput = document.getElementById('year-input');
    const monthInput = document.getElementById('month-input');
    const renderBtn = document.getElementById('render-calendar-btn');

    // 일정 추가 모달 관련 요소
    const addModalEl = document.getElementById('schedule-modal');
    const addModalInstance = new bootstrap.Modal(addModalEl);
    const scheduleForm = document.getElementById('schedule-form');
    const scheduleDateInput = document.getElementById('schedule-date');
    const scheduleTitleInput = document.getElementById('schedule-title');
    const scheduleContentInput = document.getElementById('schedule-content');
    const scheduleCategoryInput = document.getElementById('schedule-category');
    const schedulePrioritySelect = document.getElementById('schedule-priority');
    const cancelAddModalBtn = document.getElementById('cancel-modal-btn');

    // 공지 상세/수정 모달 관련 요소
    const detailsModalEl = document.getElementById('details-modal');
    const detailsModalInstance = new bootstrap.Modal(detailsModalEl);
    const detailsIdInput = document.getElementById('details-id');
    const detailsEditDateInput = document.getElementById('details-edit-date');
    const detailsEditTitleInput = document.getElementById('details-edit-title');
    const detailsEditContentInput = document.getElementById('details-edit-content');
    const detailsEditCategorySelect = document.getElementById('details-edit-category');
    const detailsEditPrioritySelect = document.getElementById('details-edit-priority');
    const deleteScheduleBtn = document.getElementById('delete-schedule-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const updateScheduleBtn = document.getElementById('update-schedule-btn');

    // 로컬 스토리지에서 일정 불러옴
    async function fetchAnnouncements() {
        const storedSchedules = localStorage.getItem(getCalendarKey());
        return storedSchedules ? JSON.parse(storedSchedules) : [];
    }

    // 드롭다운에 카테고리 옵션 채움
    function populateCategoryDropdowns() {
        const storedCategories = localStorage.getItem(getCategoriesKey());
        const categories = storedCategories ? JSON.parse(storedCategories) : ['수업', '장학', '행사', '기타']; //기본 카테고리

        // 검색 카테고리 드롭다운 업데이트
        searchCategorySelect.innerHTML = '<option value="">전체</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            searchCategorySelect.appendChild(option);
        });

        // 일정 추가/수정 모달의 카테고리 드롭다운 업데이트
        const dropdowns = [scheduleCategoryInput, detailsEditCategorySelect];
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

    // 일정 요소를 생성하여 반환
    function createScheduleElement(schedule, isHighlighted) {
        const scheduleItem = document.createElement('div');
        scheduleItem.className = 'schedule-item';
        scheduleItem.dataset.id = schedule.id;
        scheduleItem.textContent = schedule.title;

        // 하이라이트 여부
        if (isHighlighted) {
            scheduleItem.style.backgroundColor = schedule.color;
            scheduleItem.style.color = 'white';
        } else {
            scheduleItem.style.border = `2px solid ${schedule.color}`;
            scheduleItem.style.backgroundColor = 'white';
            scheduleItem.style.color = '#333';
        }
        return scheduleItem;
    }

    // 달력을 렌더링하고 해당 월의 일정을 표시
    function renderCalendar(date, schedulesToRender, highlightedSchedules = []) {
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

                    // 해당 날짜의 일정 표시
                    schedulesToRender.forEach(schedule => {
                        if (schedule.date === fullDate) {
                            const isHighlighted = highlightedSchedules.some(hs => hs.id === schedule.id);
                            const scheduleElement = createScheduleElement(schedule, isHighlighted);
                            cell.appendChild(scheduleElement);
                        }
                    });
                    day++;
                }
            }
            if (day > daysInMonth) break;
        }
        calendarContainer.appendChild(table);
    }

    // 일정 목록을 테이블 형태로 렌더링하고 표시
    function renderScheduleList(schedulesToRender, highlightedSchedules = []) {
        let listHtml = `<table class="table table-hover" style="font-size: 0.9rem;"><thead class="blue-header"><tr><th>날짜</th><th>분류</th><th>제목</th><th>중요도</th></tr></thead><tbody>`;
        if (schedulesToRender.length === 0) {
            listHtml += '<tr><td colspan="4" class="text-center text-muted">해당하는 공지가 없습니다.</td></tr>';
        } else {
            schedulesToRender.forEach(s => {
                const isHighlighted = highlightedSchedules.length > 0 && highlightedSchedules.some(hs => hs.id === s.id);
                const style = isHighlighted ? `style="background-color: ${s.color}; color: white;"` : '';
                const date = new Date(s.date);
                const formattedDate = `${String(date.getFullYear()).substring(2)}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
                listHtml += `<tr data-id="${s.id}" style="cursor: pointer;"><td>${formattedDate}</td><td>${s.category || '미지정'}</td><td>${s.title}</td><td>${s.priority || '보통'}</td></tr>`;
            });
        }
        listHtml += '</tbody></table>';
        scheduleListContainer.innerHTML = listHtml;
    }

    // 현재 월의 달력과 일정 목록을 모두 렌더링
    function renderAll() {
        const currentMonthSchedules = allSchedules.filter(s =>
            new Date(s.date).getFullYear() === currentDate.getFullYear() &&
            new Date(s.date).getMonth() === currentDate.getMonth()
        );
        renderCalendar(currentDate, currentMonthSchedules);
        renderScheduleList(currentMonthSchedules);
    }

    // 검색 조건에 따라 일정을 필터링하고 화면을 다시 렌더링
    function handleSearch() {
        const category = searchCategorySelect.value;
        const priority = searchPrioritySelect.value;
        const keyword = searchKeywordInput.value.toLowerCase();

        const currentMonthSchedules = allSchedules.filter(s =>
            new Date(s.date).getFullYear() === currentDate.getFullYear() &&
            new Date(s.date).getMonth() === currentDate.getMonth()
        );

        const isSearching = category || priority || keyword;

        if (!isSearching) {
            renderAll();
            return;
        }

        // 검색 조건에 맞는 일정 필터링
        const filteredSchedules = currentMonthSchedules.filter(s => {
            const categoryMatch = !category || (s.category || '미지정') === category;
            const priorityMatch = !priority || (s.priority || '보통') === priority;
            const keywordMatch = !keyword || s.title.toLowerCase().includes(keyword) || (s.content && s.content.toLowerCase().includes(keyword));
            return categoryMatch && priorityMatch && keywordMatch;
        });

        renderCalendar(currentDate, currentMonthSchedules, filteredSchedules);
        renderScheduleList(filteredSchedules);
    }

    // 일정 추가 모달 열기
    function openAddModal(date) {
        scheduleForm.reset();
        scheduleDateInput.value = date;
        addModalInstance.show();
        addModalEl.addEventListener('shown.bs.modal', () => scheduleTitleInput.focus());
    }

    // 일정 추가 모달 닫기
    function closeAddModal() {
        scheduleForm.reset();
        addModalInstance.hide();
    }

    // 새 일정을 추가하고 로컬 스토리지에 저장
    function addSchedule(e) {
        e.preventDefault();
        if (!scheduleCategoryInput.value) {
            alert('분류를 선택해주세요.');
            return;
        }
        const newSchedule = {
            id: Date.now(),
            date: scheduleDateInput.value,
            title: scheduleTitleInput.value,
            content: scheduleContentInput.value,
            category: scheduleCategoryInput.value,
            priority: schedulePrioritySelect.value,
            site: '사용자 추가',
            color: '#6c757d'
        };
        allSchedules.push(newSchedule);
        localStorage.setItem(getCalendarKey(), JSON.stringify(allSchedules));
        closeAddModal();
        renderAll();
    }

    // 일정 상세/수정 모달 열기
    function openDetailsModal(id) {
        const schedule = allSchedules.find(s => s.id === id);
        if (schedule) {
            currentScheduleId = id;
            detailsIdInput.value = schedule.id;
            detailsEditDateInput.value = schedule.date;
            detailsEditTitleInput.value = schedule.title;
            detailsEditContentInput.value = schedule.content || '';
            detailsEditCategorySelect.value = schedule.category || '';
            detailsEditPrioritySelect.value = schedule.priority || '보통';
            detailsModalInstance.show();
        }
    }

    // 일정 상세/수정 모달 닫기
    function closeDetailsModal() {
        detailsModalInstance.hide();
    }

    // 기존 일정 업데이트하고 로컬 스토리지에 저장
    function updateSchedule() {
        if (!detailsEditCategorySelect.value) {
            alert('분류를 선택해주세요.');
            return;
        }
        const scheduleIndex = allSchedules.findIndex(s => s.id === currentScheduleId);
        if (scheduleIndex > -1) {
            allSchedules[scheduleIndex] = {
                ...allSchedules[scheduleIndex],
                date: detailsEditDateInput.value,
                title: detailsEditTitleInput.value,
                content: detailsEditContentInput.value,
                category: detailsEditCategorySelect.value,
                priority: detailsEditPrioritySelect.value
            };
            localStorage.setItem(getCalendarKey(), JSON.stringify(allSchedules));
            closeDetailsModal();
            renderAll();
        }
    }

    // 일정을 삭제하고 로컬 스토리지에 저장
    function deleteSchedule() {
        if (confirm('정말로 이 공지를 삭제하시겠습니까?')) {
            allSchedules = allSchedules.filter(s => s.id !== currentScheduleId);
            localStorage.setItem(getCalendarKey(), JSON.stringify(allSchedules));
            closeDetailsModal();
            renderAll();
        }
    }

    renderBtn.addEventListener('click', () => {
        const year = parseInt(yearInput.value);
        const month = parseInt(monthInput.value) - 1;
        if (!isNaN(year) && !isNaN(month)) {
            currentDate = new Date(year, month);
            renderAll();
        }
    });

    searchBtn.addEventListener('click', handleSearch);
    searchKeywordInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') handleSearch(); });

    calendarContainer.addEventListener('click', (e) => {
        const scheduleItem = e.target.closest('.schedule-item');
        const cell = e.target.closest('td[data-date]');
        if (scheduleItem) {
            e.stopPropagation();
            const scheduleId = Number(scheduleItem.dataset.id);
            openDetailsModal(scheduleId);
        } else if (cell && !cell.classList.contains('other-month')) {
            openAddModal(cell.dataset.date);
        }
    });

    scheduleListContainer.addEventListener('click', (e) => {
        const row = e.target.closest('tr[data-id]');
        if (row) {
            const scheduleId = Number(row.dataset.id);
            openDetailsModal(scheduleId);
        }
    });

    scheduleForm.addEventListener('submit', addSchedule);
    cancelAddModalBtn.addEventListener('click', closeAddModal);
    deleteScheduleBtn.addEventListener('click', deleteSchedule);
    updateScheduleBtn.addEventListener('click', updateSchedule);
    cancelEditBtn.addEventListener('click', closeDetailsModal);

    window.addEventListener('storage', (e) => {
        if (e.key === getCategoriesKey()) {
            populateCategoryDropdowns();
        }
        if (e.key === getCalendarKey()) {
            initialize();
        }
    });

    async function initialize() {
        // 저장된 모든 일정을 불러오고 화면 구성
        allSchedules = await fetchAnnouncements();
        populateCategoryDropdowns();

        yearInput.value = currentDate.getFullYear();
        monthInput.value = currentDate.getMonth() + 1;

        renderAll();
    }

    initialize();
});