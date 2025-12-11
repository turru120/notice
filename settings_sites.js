document.addEventListener('DOMContentLoaded', () => {
    // 사이트 추가/수정 모달 관련 요소
    const siteModalEl = document.getElementById('site-modal');
    const siteModal = siteModalEl ? new bootstrap.Modal(siteModalEl) : null;
    const siteForm = document.getElementById('site-form');
    const siteIdInput = document.getElementById('site-id');
    const siteNameInput = document.getElementById('site-name');
    const siteUrlInput = document.getElementById('site-url');
    const noticeListSelectorInput = document.getElementById('site-notice-list-selector');
    const noticeTitleSelectorInput = document.getElementById('site-notice-title-selector');
    const noticeDateSelectorInput = document.getElementById('site-notice-date-selector');

    // 버튼 및 테이블 관련 요소
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

    // 서버에서 사이트 목록을 불러오고 테이블 렌더링
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

            // 불러온 사이트 데이터를 내부 형식에 맞게 변환
            sites = serverSites.map((site, index) => {
                return {
                    id: site.id || Date.now() + index,
                    name: site.site_name,
                    url: site.site_url,
                    notice_list_selector: site.notice_list_selector || '',
                    notice_title_selector: site.notice_title_selector || '',
                    notice_date_selector: site.notice_date_selector || '',
                    isFavorite: site.isFavorite !== undefined ? site.isFavorite : false,
                    color: site.color || defaultColors[index % defaultColors.length],
                    receiveNotification: site.receiveNotification
                };
            });
            renderTable();
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">사이트 목록을 불러오는데 실패했습니다.</td></tr>`;
        }
    }

    // 현재 사이트 목록을 서버에 저장
    async function saveSites() {
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
            id: site.id,
            receiveNotification: site.receiveNotification
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
                alert(result.message || '사이트 저장에 실패했습니다.');
                return;
            }
            await loadSites();
            if (window.renderNavbar) {
                window.renderNavbar();
            }

            // [수정] 사이트 색상 변경 시 달력의 일정 색상도 즉시 업데이트 - 디자인 일관성 유지
            const newColorMap = new Map(sites.map(site => [site.name, site.color]));

            const calendarKey = getCalendarKey();
            const storedSchedules = localStorage.getItem(calendarKey);
            let allSchedules;
            try {
                allSchedules = storedSchedules ? JSON.parse(storedSchedules) : [];
            } catch (e) {
                console.error('로컬 스토리지의 일정 데이터 파싱 오류:', e);
                localStorage.removeItem(calendarKey);
                allSchedules = [];
            }

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
            alert(`사이트 목록 저장에 실패했습니다: ${error.message}`);
        }
    }

    // 현재 사이트 목록을 테이블 형태로 렌더링
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

    // 편집 모드를 토글하고 변경 사항 저장
    async function toggleEditMode() {
        if (!editModeBtn) {
            console.error('필수 DOM 요소(editModeBtn)가 없어 편집 모드를 토글할 수 없습니다.');
            return;
        }

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

    // 사이트 추가/수정 모달을 열고 폼 데이터 설정
    function openModal(siteId = null) {
        if (!siteForm || !siteIdInput || !siteNameInput || !siteUrlInput || !noticeListSelectorInput || !noticeTitleSelectorInput || !noticeDateSelectorInput || !siteModal) {
            console.error('필수 DOM 요소(siteForm 등)가 없어 사이트 추가/수정 모달을 열 수 없습니다.');
            return;
        }

        siteForm.reset();
        if (siteId) {
            // 사이트 수정 모드
            const site = sites.find(s => s.id === siteId);
            if (site) {
                const siteModalLabel = document.getElementById('site-modal-label');
                if (siteModalLabel) siteModalLabel.textContent = '사이트 수정';
                siteIdInput.value = site.id;
                siteNameInput.value = site.name;
                siteUrlInput.value = site.url;
                noticeListSelectorInput.value = site.notice_list_selector || '';
                noticeTitleSelectorInput.value = site.notice_title_selector || '';
                noticeDateSelectorInput.value = site.notice_date_selector || '';
            }
        } else {
            // 새 사이트 추가 모드
            const siteModalLabel = document.getElementById('site-modal-label');
            if (siteModalLabel) siteModalLabel.textContent = '사이트 추가';
            siteIdInput.value = '';
        }
        siteModal.show();
    }

    // 사이트 추가 또는 수정 요청을 처리하고 서버에 저장
    async function handleSave() {
        if (!siteIdInput || !siteNameInput || !siteUrlInput || !noticeListSelectorInput || !noticeTitleSelectorInput || !noticeDateSelectorInput || !siteModal) {
            console.error('필수 DOM 요소(siteIdInput 등)가 없어 사이트 정보를 저장할 수 없습니다.');
            return;
        }
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
            // 기존 사이트 수정
            const site = sites.find(s => s.id === id);
            if (site) {
                site.name = name;
                site.url = url;
                site.notice_list_selector = listSelector;
                site.notice_title_selector = titleSelector;
                site.notice_date_selector = dateSelector;
            }
        } else {
            // 새 사이트 추가
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

    if (addSiteBtn) {
        addSiteBtn.addEventListener('click', () => openModal());
    }
    if (editModeBtn) {
        editModeBtn.addEventListener('click', toggleEditMode);
    }
    if (saveSiteBtn) {
        saveSiteBtn.addEventListener('click', handleSave);
    }
    if (tableBody) {
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
    }

    loadSites();
});