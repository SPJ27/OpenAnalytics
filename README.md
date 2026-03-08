# OpenAnalytics

## What is OpenAnalytics?

**OpenAnalytics** is an open-source analytics API that developers can run on their own infrastructure to reduce costs and gain detailed insights into their website or application traffic.

Instead of relying on expensive third-party analytics platforms, OpenAnalytics lets you fully control your data while still getting powerful analytics metrics and structured datasets for dashboards and visualizations.

### Available Analytics Data

OpenAnalytics provides a wide range of useful statistics:

1. **Visits** – Total number of page visits  
2. **Unique Visitors** – Distinct users visiting the site  
3. **Bounce Rate** – Percentage of users leaving after one interaction  
4. **Total Sessions** – Total tracked sessions  
5. **Average Visits per User** – Engagement metric per user  
6. **Average Time Spent** – Average session duration  
7. **Visited Pages** – Most visited routes or pages  
8. **Visitor Information**
   - Country
   - City
   - Device type
   - Browser
   - Operating system
9. **Referrer Data** – Source of incoming traffic  
10. **Visualization Data** – Pre-formatted data compatible with libraries like:
   - **Recharts**
   - **Chart.js**

---

# Installation

There are **four main components** required to install OpenAnalytics.

## 1. Database Schema

Run the database schema in your preferred database.

```

schema.sql

````

- This file creates all required tables.
- **Supabase** is the default database provider, but any PostgreSQL database should work.

---

## 2. Tracker Script

Add the tracker script to the **head** of your website or application.

```html
<Script
  src="/tracker.js"
  data-tracker-id="a0b13b39-797f-4009-96bf-82f2c09e2704"
  data-domain="a.b"
  data-allow-localhost="true"
  data-debug="true"
  strategy="afterInteractive"
/>
````

### Configuration

| Attribute              | Description                                     |
| ---------------------- | ----------------------------------------------- |
| `data-tracker-id`      | Unique tracker ID used to identify your project |
| `data-domain`          | Domain being tracked                            |
| `data-allow-localhost` | Enables tracking during development             |
| `data-debug`           | Enables debug logs                              |

---

## 3. Stats API

This API route retrieves analytics data from the database.

```
/api/stats/route.js
```

### Example Request

```
http://192.168.56.1:3000/api/stats?id=a0b13b39-797f-4009-96bf-82f2c09e2704&fromDate=2026-01-01&toDate=2026-03-08
```

### Parameters

| Parameter  | Description                    |
| ---------- | ------------------------------ |
| `id`       | Tracker ID                     |
| `fromDate` | Start date for analytics query |
| `toDate`   | End date for analytics query   |

---

## 4. Tracking API

This endpoint records visit data sent by the tracker script.

```
/api/track/route.js
```

* This route is **automatically called** by `tracker.js`.
* It collects visit data and stores it in the database.

---

## Overview

Once installed, OpenAnalytics will:

1. Track visitor activity through `tracker.js`
2. Send data to `/api/track`
3. Store analytics in your database
4. Retrieve structured insights through `/api/stats`

You can then use the returned data to build **custom dashboards, charts, and analytics panels** for your applications.


```js
{
    "success": true,
    "data": {
        "totalVisits": 5,
        "uniqueVisitors": 2,
        "totalSessions": 4,
        "bounceRate": "25.0%",
        "avgVisitsPerUser": "2.50",
        "avgTimeSpent": "3621.60",
        "visitedPages": {
            "/": 4,
            "/abc": 1
        },
        "countries": {
            "India": 5
        },
        "cities": {
            "Nagpur": 5
        },
        "devices": {
            "Desktop": 2
        },
        "browsers": {
            "Chrome": 2
        },
        "oses": {
            "Windows": 2
        },
        "referrers": {
            "Direct": 5
        },
        "graph": [
            {
                "label": "Mar 1",
                "visits": 0,
                "users": 0
            },
            {
                "label": "Mar 2",
                "visits": 0,
                "users": 0
            },
            {
                "label": "Mar 3",
                "visits": 0,
                "users": 0
            },
            {
                "label": "Mar 4",
                "visits": 0,
                "users": 0
            },
            {
                "label": "Mar 5",
                "visits": 0,
                "users": 0
            },
            {
                "label": "Mar 6",
                "visits": 0,
                "users": 0
            },
            {
                "label": "Mar 7",
                "visits": 0,
                "users": 0
            },
            {
                "label": "Mar 8",
                "visits": 5,
                "users": 2
            }
        ],
        "bucketMode": "day"
    }
}
````