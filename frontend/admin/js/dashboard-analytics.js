(() => {
    "use strict";

    const API_BASE = "http://localhost:3000";

    const ANALYTICS_ENDPOINT =
        `${API_BASE}/api/admin/dashboard-analytics`;

    const STYLE_ID = "dashboard-appointments-analytics-style";
    const PANEL_ID = "dashboard-appointments-analytics";

    const money = (value) => {
        const amount = Number(value || 0);

        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP"
        }).format(amount);
    };

    const escapeHTML = (value) => {
        return String(value ?? "").replace(
            /[&<>"']/g,
            (character) => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            })[character]
        );
    };

    const getAdminId = () => {
        const storageKeys = [
            "adminUser",
            "addMotorUser",
            "user"
        ];

        for (const key of storageKeys) {
            try {
                const raw = localStorage.getItem(key);

                if (!raw) continue;

                const user = JSON.parse(raw);

                const id = Number(
                    user.id ||
                    user.user_id ||
                    user.admin_id
                );

                if (Number.isInteger(id) && id > 0) {
                    return id;
                }
            } catch (error) {
                // Continue checking the other existing auth keys.
            }
        }

        return 0;
    };

    const getAuthHeaders = () => {
        const headers = {
            Accept: "application/json"
        };

        const adminId = getAdminId();

        if (adminId) {
            headers["x-admin-id"] = String(adminId);
        }

        return headers;
    };

    const numberValue = (value) => {
        const parsed = Number(value);

        return Number.isFinite(parsed) ? parsed : 0;
    };

    const svgElement = (name, attributes = {}) => {
        const element = document.createElementNS(
            "http://www.w3.org/2000/svg",
            name
        );

        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, String(value));
        });

        return element;
    };

    const addSVGText = (
        svg,
        x,
        y,
        value,
        className = "",
        anchor = "middle"
    ) => {
        const text = svgElement("text", {
            x,
            y,
            "text-anchor": anchor,
            class: className
        });

        text.textContent = value;
        svg.appendChild(text);

        return text;
    };

    const getPanelMarkup = () => `
        <section
            class="dashboard-daily-revenue-grid"
            aria-label="Daily revenue totals"
        >
            <article class="dashboard-revenue-summary-card service-revenue-summary">
                <div class="dashboard-revenue-summary-icon">
                    <i class="fas fa-wrench" aria-hidden="true"></i>
                </div>

                <div class="dashboard-revenue-summary-content">
                    <span class="dashboard-revenue-summary-label">
                        Daily Service Revenue
                    </span>

                    <strong
                        class="dashboard-revenue-summary-value"
                        id="dashboardDailyServiceRevenue"
                    >
                        ₱0.00
                    </strong>

                    <span class="dashboard-revenue-summary-note">
                        Completed services scheduled today
                    </span>
                </div>
            </article>

            <article class="dashboard-revenue-summary-card product-revenue-summary">
                <div class="dashboard-revenue-summary-icon">
                    <i class="fas fa-box" aria-hidden="true"></i>
                </div>

                <div class="dashboard-revenue-summary-content">
                    <span class="dashboard-revenue-summary-label">
                        Daily Product Revenue
                    </span>

                    <strong
                        class="dashboard-revenue-summary-value"
                        id="dashboardDailyProductRevenue"
                    >
                        ₱0.00
                    </strong>

                    <span class="dashboard-revenue-summary-note">
                        Direct sales and paid online orders today
                    </span>
                </div>
            </article>
        </section>

        <section
            class="dashboard-appointment-analytics"
            id="${PANEL_ID}"
            aria-label="Appointment analytics"
        >
            <article class="dashboard-analytics-card">
                <div class="dashboard-analytics-card-header">
                    <div>
                        <h3>Daily Appointments</h3>
                        <p>Appointments scheduled Monday to Saturday</p>
                    </div>

                    <span class="dashboard-analytics-period">
                        This Week
                    </span>
                </div>

                <div
                    class="dashboard-chart-container dashboard-bar-chart-container"
                    id="dashboardDailyAppointmentsChart"
                >
                    <div class="dashboard-analytics-loading">
                        Loading daily appointments...
                    </div>
                </div>
            </article>

            <article class="dashboard-analytics-card">
                <div class="dashboard-analytics-card-header">
                    <div>
                        <h3>Weekly Appointment Categories</h3>
                        <p>Appointments grouped by service category</p>
                    </div>

                    <span class="dashboard-analytics-period">
                        Monday - Saturday
                    </span>
                </div>

                <div
                    class="dashboard-category-chart-layout"
                    id="dashboardWeeklyCategoriesChart"
                >
                    <div class="dashboard-analytics-loading">
                        Loading appointment categories...
                    </div>
                </div>
            </article>

            <article class="dashboard-analytics-card">
                <div class="dashboard-analytics-card-header">
                    <div>
                        <h3>Monthly Appointments</h3>
                        <p>Daily appointment totals for the current month</p>
                    </div>

                    <span
                        class="dashboard-analytics-period"
                        id="dashboardMonthlyPeriod"
                    >
                        This Month
                    </span>
                </div>

                <div
                    class="dashboard-chart-container dashboard-line-chart-container"
                    id="dashboardMonthlyAppointmentsChart"
                >
                    <div class="dashboard-analytics-loading">
                        Loading monthly appointments...
                    </div>
                </div>
            </article>
        </section>
    `;

    const addStylesheet = () => {
        if (document.getElementById(STYLE_ID)) return;

        const link = document.createElement("link");

        link.id = STYLE_ID;
        link.rel = "stylesheet";
        link.href = "css/dashboard-analytics.css";

        document.head.appendChild(link);
    };

    const findDashboardAnchor = () => {
        return document.querySelector(".weekly-analytics-grid");
    };

    const findPageHeading = () => {
        return (
            document.querySelector(".page-heading") ||
            document.getElementById("welcomeTitle")?.closest(".page-heading")
        );
    };

    const removeCardContaining = (elementId, selectors) => {
        const element = document.getElementById(elementId);

        if (!element) return;

        for (const selector of selectors) {
            const card = element.closest(selector);

            if (card) {
                card.remove();
                return;
            }
        }
    };

    const removeOldSections = () => {
        /*
         * Remove only the old appointment-status chart.
         * The existing Weekly Revenue Analytics card stays.
         */

        removeCardContaining("weeklyAppointmentChart", [
            ".weekly-appointment-card",
            ".analytics-card",
            ".dashboard-card"
        ]);

        /*
         * Remove the complete Recent Sales Transactions section.
         */

        removeCardContaining("recentTransactions", [
            ".recent-transactions-card",
            ".recent-card",
            "section"
        ]);

        /*
         * Remove the complete Recent Appointments section.
         */

        removeCardContaining("recentAppointments", [
            ".recent-appointments-card",
            ".recent-card",
            "section"
        ]);
    };

    const insertPanel = () => {
        if (document.getElementById(PANEL_ID)) return true;

        const heading = findPageHeading();
        const anchor = findDashboardAnchor();

        if (!heading || !anchor || !anchor.parentNode) {
            return false;
        }

        const wrapper = document.createElement("div");
        wrapper.innerHTML = getPanelMarkup();

        const revenueCards = wrapper.firstElementChild;
        const analyticsPanel = revenueCards.nextElementSibling;

        /*
         * Revenue cards: immediately below the page heading.
         */

        heading.insertAdjacentElement(
            "afterend",
            revenueCards
        );

        /*
         * Appointment charts: before the existing weekly analytics grid.
         * This preserves the Weekly Revenue Analytics card below them.
         */

        anchor.parentNode.insertBefore(
            analyticsPanel,
            anchor
        );

        return true;
    };

    const renderDailyAppointments = (days) => {
        const container = document.getElementById(
            "dashboardDailyAppointmentsChart"
        );

        if (!container) return;

        const data = Array.isArray(days) ? days : [];

        if (!data.length) {
            container.innerHTML = `
                <div class="dashboard-analytics-empty">
                    No appointment data is available for this week.
                </div>
            `;
            return;
        }

        const width = 720;
        const height = 290;
        const left = 48;
        const right = 20;
        const top = 20;
        const bottom = 48;

        const chartWidth = width - left - right;
        const chartHeight = height - top - bottom;

        const maxValue = Math.max(
            1,
            ...data.map((item) => numberValue(item.total))
        );

        const tickStep = Math.max(
            1,
            Math.ceil(maxValue / 4)
        );

        const axisMax = tickStep * 4;

        const svg = svgElement("svg", {
            viewBox: `0 0 ${width} ${height}`,
            class: "dashboard-analytics-svg",
            role: "img",
            "aria-label": "Daily appointments bar chart"
        });

        for (let tick = 0; tick <= 4; tick++) {
            const value = axisMax - tick * tickStep;
            const y = top + (tick / 4) * chartHeight;

            svg.appendChild(
                svgElement("line", {
                    x1: left,
                    y1: y,
                    x2: width - right,
                    y2: y,
                    class: "dashboard-chart-gridline"
                })
            );

            addSVGText(
                svg,
                left - 12,
                y + 4,
                String(value),
                "dashboard-chart-axis-label",
                "end"
            );
        }

        const slotWidth = chartWidth / data.length;
        const barWidth = Math.min(58, slotWidth * 0.52);

        data.forEach((item, index) => {
            const value = numberValue(item.total);
            const barHeight = (value / axisMax) * chartHeight;

            const x =
                left +
                index * slotWidth +
                (slotWidth - barWidth) / 2;

            const y = top + chartHeight - barHeight;

            const bar = svgElement("rect", {
                x,
                y,
                width: barWidth,
                height: Math.max(0, barHeight),
                rx: 6,
                class: "dashboard-chart-bar"
            });

            const title = svgElement("title");
            title.textContent =
                `${item.label}: ${value} appointment(s)`;

            bar.appendChild(title);
            svg.appendChild(bar);

            addSVGText(
                svg,
                x + barWidth / 2,
                Math.max(top + 13, y - 8),
                String(value),
                "dashboard-chart-value"
            );

            addSVGText(
                svg,
                x + barWidth / 2,
                height - 17,
                item.label,
                "dashboard-chart-axis-label"
            );
        });

        container.innerHTML = "";
        container.appendChild(svg);
    };

    const renderWeeklyCategories = (categories) => {
        const container = document.getElementById(
            "dashboardWeeklyCategoriesChart"
        );

        if (!container) return;

        const data = Array.isArray(categories)
            ? categories
            : [];

        const categoryColors = {
            maintenance: "#e63946",
            repair: "#f59e0b",
            upgrade: "#3b82f6"
        };

        const normalized = [
            {
                category: "Maintenance",
                key: "maintenance",
                total: 0
            },
            {
                category: "Repair",
                key: "repair",
                total: 0
            },
            {
                category: "Upgrade",
                key: "upgrade",
                total: 0
            }
        ].map((category) => {
            const match = data.find(
                (item) =>
                    String(item.key || "").toLowerCase() ===
                    category.key
            );

            return {
                ...category,
                total: match ? numberValue(match.total) : 0
            };
        });

        const total = normalized.reduce(
            (sum, item) => sum + item.total,
            0
        );

        let currentAngle = 0;

        const segments = normalized.map((item) => {
            const percentage = total > 0
                ? (item.total / total) * 100
                : 0;

            const start = currentAngle;
            currentAngle += percentage;

            return {
                ...item,
                percentage,
                start,
                end: currentAngle,
                color: categoryColors[item.key]
            };
        });

        const gradient = total > 0
            ? segments
                .filter((item) => item.percentage > 0)
                .map((item) =>
                    `${item.color} ${item.start}% ${item.end}%`
                )
                .join(", ")
            : "#e5e7eb 0% 100%";

        const legend = segments.map((item) => `
            <div class="dashboard-category-legend-item">
                <span
                    class="dashboard-category-legend-dot"
                    style="background:${item.color}"
                ></span>

                <span class="dashboard-category-legend-name">
                    ${escapeHTML(item.category)}
                </span>

                <strong class="dashboard-category-legend-value">
                    ${item.total}
                </strong>

                <span class="dashboard-category-legend-percent">
                    ${item.percentage.toFixed(1)}%
                </span>
            </div>
        `).join("");

        container.innerHTML = `
            <div class="dashboard-category-pie-wrapper">
                <div
                    class="dashboard-category-pie"
                    style="background:conic-gradient(${gradient})"
                    role="img"
                    aria-label="Weekly appointment categories pie chart"
                >
                    <div class="dashboard-category-pie-center">
                        <strong>${total}</strong>
                        <span>Appointments</span>
                    </div>
                </div>
            </div>

            <div class="dashboard-category-legend">
                ${legend}
            </div>
        `;
    };

    const renderMonthlyAppointments = (days) => {
        const container = document.getElementById(
            "dashboardMonthlyAppointmentsChart"
        );

        if (!container) return;

        const data = Array.isArray(days) ? days : [];

        if (!data.length) {
            container.innerHTML = `
                <div class="dashboard-analytics-empty">
                    No appointment data is available for this month.
                </div>
            `;
            return;
        }

        const width = 900;
        const height = 300;
        const left = 48;
        const right = 20;
        const top = 22;
        const bottom = 48;

        const chartWidth = width - left - right;
        const chartHeight = height - top - bottom;

        const maxValue = Math.max(
            1,
            ...data.map((item) => numberValue(item.total))
        );

        const tickStep = Math.max(
            1,
            Math.ceil(maxValue / 4)
        );

        const axisMax = tickStep * 4;

        const svg = svgElement("svg", {
            viewBox: `0 0 ${width} ${height}`,
            class: "dashboard-analytics-svg",
            role: "img",
            "aria-label": "Monthly appointments line chart"
        });

        for (let tick = 0; tick <= 4; tick++) {
            const value = axisMax - tick * tickStep;
            const y = top + (tick / 4) * chartHeight;

            svg.appendChild(
                svgElement("line", {
                    x1: left,
                    y1: y,
                    x2: width - right,
                    y2: y,
                    class: "dashboard-chart-gridline"
                })
            );

            addSVGText(
                svg,
                left - 12,
                y + 4,
                String(value),
                "dashboard-chart-axis-label",
                "end"
            );
        }

        const points = data.map((item, index) => {
            const value = numberValue(item.total);

            const x = data.length === 1
                ? left + chartWidth / 2
                : left +
                    (index / (data.length - 1)) * chartWidth;

            const y =
                top +
                chartHeight -
                (value / axisMax) * chartHeight;

            return {
                x,
                y,
                value,
                item
            };
        });

        const linePath = points
            .map((point, index) =>
                `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
            )
            .join(" ");

        const areaPath = [
            `M ${points[0].x} ${top + chartHeight}`,
            ...points.map((point) =>
                `L ${point.x} ${point.y}`
            ),
            `L ${points[points.length - 1].x} ${top + chartHeight}`,
            "Z"
        ].join(" ");

        svg.appendChild(
            svgElement("path", {
                d: areaPath,
                class: "dashboard-chart-area"
            })
        );

        svg.appendChild(
            svgElement("path", {
                d: linePath,
                class: "dashboard-chart-line"
            })
        );

        points.forEach((point, index) => {
            const circle = svgElement("circle", {
                cx: point.x,
                cy: point.y,
                r: 3.5,
                class: "dashboard-chart-point"
            });

            const title = svgElement("title");
            title.textContent =
                `${point.item.date}: ${point.value} appointment(s)`;

            circle.appendChild(title);
            svg.appendChild(circle);

            const dayNumber = Number(
                String(point.item.date).slice(-2)
            );

            const isLast = index === points.length - 1;

            if (
                dayNumber === 1 ||
                dayNumber % 5 === 0 ||
                isLast
            ) {
                addSVGText(
                    svg,
                    point.x,
                    height - 17,
                    String(dayNumber),
                    "dashboard-chart-axis-label"
                );
            }
        });

        container.innerHTML = "";
        container.appendChild(svg);
    };

    const renderRevenueCards = (dailyRevenue) => {
        const serviceElement = document.getElementById(
            "dashboardDailyServiceRevenue"
        );

        const productElement = document.getElementById(
            "dashboardDailyProductRevenue"
        );

        if (serviceElement) {
            serviceElement.textContent = money(
                dailyRevenue?.service_revenue
            );
        }

        if (productElement) {
            productElement.textContent = money(
                dailyRevenue?.product_revenue
            );
        }
    };

    const renderAnalytics = (data) => {
        renderRevenueCards(data.daily_revenue);

        renderDailyAppointments(
            data.daily_appointments
        );

        renderWeeklyCategories(
            data.weekly_appointment_categories
        );

        renderMonthlyAppointments(
            data.monthly_appointments
        );

        const monthlyPeriod = document.getElementById(
            "dashboardMonthlyPeriod"
        );

        if (
            monthlyPeriod &&
            data.periods?.month_start
        ) {
            const start = new Date(
                `${data.periods.month_start}T12:00:00`
            );

            monthlyPeriod.textContent =
                start.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric"
                });
        }
    };

    const showLoadingError = () => {
        const containers = [
            "dashboardDailyAppointmentsChart",
            "dashboardWeeklyCategoriesChart",
            "dashboardMonthlyAppointmentsChart"
        ];

        containers.forEach((id) => {
            const container = document.getElementById(id);

            if (container) {
                container.innerHTML = `
                    <div class="dashboard-analytics-error">
                        Unable to load analytics.
                        Please refresh the dashboard.
                    </div>
                `;
            }
        });

        const serviceElement = document.getElementById(
            "dashboardDailyServiceRevenue"
        );

        const productElement = document.getElementById(
            "dashboardDailyProductRevenue"
        );

        if (serviceElement) serviceElement.textContent = "Unavailable";
        if (productElement) productElement.textContent = "Unavailable";
    };

    const loadAnalytics = async () => {
        try {
            const response = await fetch(
                ANALYTICS_ENDPOINT,
                {
                    method: "GET",
                    headers: getAuthHeaders(),
                    credentials: "include",
                    cache: "no-store"
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    "Unable to retrieve dashboard analytics."
                );
            }

            renderAnalytics(data);

        } catch (error) {
            console.error(
                "Dashboard analytics loading error:",
                error
            );

            showLoadingError();
        }
    };

    const initialize = () => {
        addStylesheet();

        /*
         * Prevent the legacy dashboard renderer from
         * modifying the Recent Appointments section.
         */

        window.renderAppointmentAnalytics = function () {
            // Replaced by the new dashboard analytics module.
        };

        removeOldSections();

        if (!insertPanel()) {
            console.warn(
                "Dashboard analytics could not find the page heading or weekly analytics section."
            );

            return;
        }

        loadAnalytics();
    };

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            { once: true }
        );
    } else {
        initialize();
    }
})();