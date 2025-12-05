document.addEventListener('DOMContentLoaded', () => {
    const siteModalEl = document.getElementById('site-modal');
    const siteModal = new bootstrap.Modal(siteModalEl);
    const siteForm = document.getElementById('site-form');
    const siteIdInput = document.getElementById('site-id');
    const siteNameInput = document.getElementById('site-name');
    const siteUrlInput = document.getElementById('site-url');
    const noticeListSelectorInput = document.getElementById('site-notice-list-selector');
    const noticeTitleSelectorInput = document.getElementById('site-notice-title-selector');
    const noticeDateSelectorInput = document.getElementById('site-notice-date-selector');

    const saveSiteBtn = document.getElementById('save-site-btn');
    const addSiteBtn = document.getElementById('add-site-btn');
    const editModeBtn = document.getElementById('edit-mode-btn');
    const tableBody = document.getElementById('sites-table-body');
    const actionsHeader = document.querySelector('.actions-column');

    let sites = [];
    let isEditMode = false;
    const defaultColors = [
        '#007BFF', '#28A745', '#DC3545', '#FFC107', '#17A2B8', '#6610f2', '#fd7e14', '#e83e8c', '#20c997'
    ];

    async function loadSites() {
        try {
            const userId = localStorage.getItem('current_user_id');
            if (!userId) throw new Error("No user is logged in.");

            const response = await fetch(`get_sites.php?user_id=${userId}&t=${new Date().getTime()}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const user = await response.json();
            const serverSites = user.registered_sites || [];

            sites = serverSites.map((site, index) => {
                return {
                    id: site.id || Date.now() + index,
                    name: site.site_name,
                    url: site.site_url,
                    notice_list_selector: site.notice_list_selector || '',
                    notice_title_selector: site.notice_title_selector || '',
                    notice_date_selector: site.notice_date_selector || '',
                    isFavorite: site.isFavorite !== undefined ? site.isFavorite : false,
                    color: site.color || defaultColors[index % defaultColors.length]
                };
            });
            renderTable();
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">사이트 목록을 불러오는데 실패했습니다.</td></tr>`;
        }
    }

    async function saveSites() {
        // 현재 사이트 목록 전체를 서버에 저장
        const userId = localStorage.getItem('current_user_id');
        if (!userId) {
            alert('로그인 정보가 없습니다. 다시 로그인해주세요.');
            return;
        }

        const sitesToSave = sites.map(site => ({
            site_name: site.name,
            site_url: site.url,
            notice_list_selector: site.notice_list_selector,
            notice_title_selector: site.notice_title_selector,
            notice_date_selector: site.notice_date_selector,
            isFavorite: site.isFavorite,
            color: site.color,
            id: site.id
        }));

        try {
            const response = await fetch('save_sites.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: userId, sites: sitesToSave }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || 'Failed to save sites.');
            }
            await loadSites();
            if (window.renderNavbar) {
                window.renderNavbar();
            }

            // [수정] 사이트 색상 변경 시 달력의 일정 색상도 즉시 업데이트 - 디자인 일관성 유지
            const newColorMap = new Map(sites.map(site => [site.name, site.color]));

            const calendarKey = `calendar_schedules_${userId || 'guest'}`;
            const storedSchedules = localStorage.getItem(calendarKey);
            let allSchedules = storedSchedules ? JSON.parse(storedSchedules) : [];

            let schedulesModified = false;
            allSchedules.forEach(schedule => {
                if (newColorMap.has(schedule.site)) {
                    const newColor = newColorMap.get(schedule.site);
                    if (schedule.color !== newColor) {
                        schedule.color = newColor;
                        schedulesModified = true;
                    }
                }
            });

            if (schedulesModified) {
                localStorage.setItem(calendarKey, JSON.stringify(allSchedules));
            }

        } catch (error) {
            alert('사이트 목록 저장에 실패했습니다.');
        }
    }

    function renderTable() {
        tableBody.innerHTML = '';
        sites.forEach(site => {
            const row = document.createElement('tr');
            row.dataset.id = site.id;

            let favoriteCellHtml = '';
            let colorCellHtml = '';

            if (isEditMode) {
                favoriteCellHtml = `
                    <div class="form-check d-flex justify-content-center">
                        <input class="form-check-input favorite-checkbox" type="checkbox" ${site.isFavorite ? 'checked' : ''}>
                    </div>
                `;
                colorCellHtml = `<input type="color" class="form-control form-control-color site-color-input" value="${site.color}">`;
            } else {
                favoriteCellHtml = site.isFavorite ? '예' : '아니오';
                colorCellHtml = `<div style="width: 25px; height: 25px; background-color: ${site.color}; border-radius: 50%; margin: auto;"></div>`;
            }

            row.innerHTML = `
                <td>${site.name}</td>
                <td><a href="${site.url}" target="_blank">${site.url}</a></td>
                <td>${favoriteCellHtml}</td>
                <td>${colorCellHtml}</td>
                <td class="actions-column" style="display: ${isEditMode ? 'table-cell' : 'none'};">
                    <button class="btn btn-secondary btn-xsm edit-btn">수정</button>
                    <button class="btn btn-danger btn-xsm delete-btn">삭제</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        actionsHeader.style.display = isEditMode ? 'table-cell' : 'none';
    }

    async function toggleEditMode() {
        if (isEditMode) {
            const favoriteCheckboxes = document.querySelectorAll('.favorite-checkbox');
            const colorInputs = document.querySelectorAll('.site-color-input');

            sites.forEach((site, index) => {
                site.isFavorite = favoriteCheckboxes[index].checked;
                site.color = colorInputs[index].value;
            });
            await saveSites();
        }

        isEditMode = !isEditMode;
        editModeBtn.textContent = isEditMode ? '완료' : '편집';
        editModeBtn.classList.toggle('btn-outline-secondary');
        editModeBtn.classList.toggle('btn-success');
        renderTable();
    }

    function openModal(siteId = null) {
        siteForm.reset();
        if (siteId) {
            const site = sites.find(s => s.id === siteId);
            if (site) {
                document.getElementById('site-modal-label').textContent = '사이트 수정';
                siteIdInput.value = site.id;
                siteNameInput.value = site.name;
                siteUrlInput.value = site.url;
                noticeListSelectorInput.value = site.notice_list_selector || '';
                noticeTitleSelectorInput.value = site.notice_title_selector || '';
                noticeDateSelectorInput.value = site.notice_date_selector || '';
            }
        } else {
            document.getElementById('site-modal-label').textContent = '사이트 추가';
            siteIdInput.value = '';
        }
        siteModal.show();
    }

    // 저장 버튼을 눌렀을 때 
    async function handleSave() {
        const id = siteIdInput.value ? Number(siteIdInput.value) : null;
        const name = siteNameInput.value.trim();
        const url = siteUrlInput.value.trim();
        const listSelector = noticeListSelectorInput.value.trim();
        const titleSelector = noticeTitleSelectorInput.value.trim();
        const dateSelector = noticeDateSelectorInput.value.trim();

        if (!name || !url || !listSelector || !titleSelector) {
            alert('사이트 명, 링크, 공지 목록 선택자, 공지 제목 선택자를 모두 입력해주세요.');
            return;
        }

        if (id) {
            const site = sites.find(s => s.id === id);
            if (site) {
                site.name = name;
                site.url = url;
                site.notice_list_selector = listSelector;
                site.notice_title_selector = titleSelector;
                site.notice_date_selector = dateSelector;
            }
        } else {
            // [추가] 새 사이트 추가 시 기본 색 할당 - 사용자 편의성 향상
            const newColor = defaultColors[sites.length % defaultColors.length];
            sites.push({
                id: Date.now(),
                name: name,
                url: url,
                notice_list_selector: listSelector,
                notice_title_selector: titleSelector,
                notice_date_selector: dateSelector,
                isFavorite: false,
                color: newColor
            });
        }
        await saveSites();
        siteModal.hide();
    }

    function handleTableClick(e) {
        const target = e.target;
        const row = target.closest('tr');
        if (!row) return;
        const siteId = Number(row.dataset.id);

        if (target.classList.contains('edit-btn')) {
            openModal(siteId);
        } else if (target.classList.contains('delete-btn')) {
            if (confirm('정말로 이 사이트를 삭제하시겠습니까?')) {
                sites = sites.filter(s => s.id !== siteId);
                saveSites();
            }
        }
    }

    addSiteBtn.addEventListener('click', () => openModal());
    editModeBtn.addEventListener('click', toggleEditMode);
    saveSiteBtn.addEventListener('click', handleSave);
    tableBody.addEventListener('click', handleTableClick);

    tableBody.addEventListener('change', (e) => {
        if (isEditMode && e.target.classList.contains('favorite-checkbox')) {
            if (e.target.checked) {
                const checkedCount = tableBody.querySelectorAll('.favorite-checkbox:checked').length;
                if (checkedCount > 3) {
                    alert('즐겨찾기는 최대 3개까지 선택할 수 있습니다.');
                    e.target.checked = false;
                }
            }
        }
    });

    loadSites();
});