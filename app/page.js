import React from 'react'

const page = async () => {
  const data = await fetch('http://192.168.56.1:3000/api/stats?id=a0b13b39-797f-4009-96bf-82f2c09e2704&fromDate=2026-03-01&toDate=2026-03-08', {method: 'GET'
  })
    

  const { data: stats } = await data.json()
  console.log(stats)
  return (
    <>
    <div>The analytics of the page that you are viewing right now</div>
    <div>Visits: {stats.totalVisits}</div>

    </>
  )
}

export default page