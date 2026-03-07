import { createClient } from "@/utils/supabase/server";

export async function POST(req) {
  const { id, domain, creator, visits, users } = await req.json();
  const supabase = createClient();
  await supabase.from('data').select('*').eq('id', id).then(async ({ data }) => {
    if (data.length === 0) {
      return Response.json({ success: false, message: 'Data not found' });
    } else {
      await supabase.from('data').update({ connected:true }).eq('id', id);
    }
  });
  return Response.json({ success: true });
}

/*
data structure
{
id: string,
domain: string,
creator: string,
visits: {
  sessionId: {date:, timeSpent:, startTime:, location:}
},
users: {
  userId: {name:, email:, visitIds:, dateCreated:}
},
connected: boolean
}
*/