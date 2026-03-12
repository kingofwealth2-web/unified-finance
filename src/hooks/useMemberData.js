import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";

export function useMemberData({ session, orgId }) {
  const [data, setData] = useState({
    profile: null,
    contributions: [],
    paymentTypes: [],
    org: null,
    rankOverall: null,        // { rank, total_members, member_total }
    rankByType: [],           // [{ payment_type_id, payment_type_name, member_total, rank, total_members }]
    loading: true,
  });

  const fetchAll = useCallback(async () => {
    if (!session?.user?.id || !orgId) return;
    const uid = session.user.id;

    try {
      const [
        { data: profile },
        { data: contributions },
        { data: paymentTypes },
        { data: orgRows },
        { data: rankOverall },
        { data: rankByType },
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("contributions")
          .select("*, payment_types(id,name,color)")
          .eq("org_id", orgId)
          .eq("member_id", uid)
          .order("created_at", { ascending: false }),
        supabase.from("payment_types").select("*").eq("org_id", orgId).order("created_at"),
        supabase.from("org_settings").select("*").eq("id", orgId).limit(1),
        supabase.rpc("get_member_rank", { p_user_id: uid, p_org_id: orgId }),
        supabase.rpc("get_member_rank_by_type", { p_user_id: uid, p_org_id: orgId }),
      ]);

      setData({
        profile:      profile || null,
        contributions: contributions || [],
        paymentTypes:  paymentTypes || [],
        org:           orgRows?.[0] || null,
        rankOverall:   rankOverall?.[0] || null,
        rankByType:    rankByType || [],
        loading: false,
      });
    } catch (err) {
      console.error("useMemberData fetch error:", err);
      setData(d => ({ ...d, loading: false }));
    }
  }, [session?.user?.id, orgId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // fmt helper
  const fmt = (n) => {
    const currency = data.org?.currency || "USD";
    return `${currency} ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return { data, fmt, refresh: fetchAll };
}
