document.addEventListener('DOMContentLoaded', () => {
    async function renderNavbar() {
        const userNameDisplay = document.getElementById('user-name-display');
        if (userNameDisplay) {
            const currentUser = localStorage.getItem('current_user_name');
            userNameDisplay.textContent = currentUser || '사용자';
        }

        const navbarLinksContainer = document.getElementById('navbar-links');
        const settingsDropdown = document.getElementById('settings-dropdown-li');

        if (!navbarLinksContainer) return;

        while (navbarLinksContainer.firstChild && navbarLinksContainer.firstChild.id !== 'settings-dropdown-li') {
            navbarLinksContainer.removeChild(navbarLinksContainer.firstChild);
        }

        const allAnnouncementsLi = document.createElement('li');
        const allAnnouncementsA = document.createElement('a');
        allAnnouncementsA.href = 'all_notices.html';
        allAnnouncementsA.textContent = '전체 공지';
        allAnnouncementsA.classList.add('nav-link');
        allAnnouncementsLi.appendChild(allAnnouncementsA);
        navbarLinksContainer.insertBefore(allAnnouncementsLi, settingsDropdown);

        try {
            const userId = localStorage.getItem('current_user_id');
            if (!userId) {
                return;
            }

            const response = await fetch(`get_sites.php?user_id=${userId}&t=${new Date().getTime()}`);
            if (!response.ok) {
                throw new Error('Failed to fetch sites for navbar.');
            }
            const user = await response.json();
            const sites = user.registered_sites || [];

            const favoriteSites = sites.filter(site => site.isFavorite);

            favoriteSites.forEach(site => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = `favorite_site.html?id=${site.id}`;
                a.textContent = site.site_name;
                a.classList.add('nav-link');

                li.appendChild(a);
                navbarLinksContainer.insertBefore(li, settingsDropdown);
            });
        } catch (error) {
            const errorLi = document.createElement('li');
            errorLi.textContent = '즐겨찾기 로딩 실패';
            errorLi.classList.add('nav-link', 'text-danger');
            navbarLinksContainer.insertBefore(errorLi, settingsDropdown);
        }
    }
    window.renderNavbar = renderNavbar;

    renderNavbar();
});

