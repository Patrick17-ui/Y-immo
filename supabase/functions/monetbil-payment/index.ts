import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const MONETBIL_API_BASE = "https://api.monetbil.com/payment/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const serviceKey = Deno.env.get("MONETBIL_SERVICE_KEY");
    if (!serviceKey) {
      return new Response(JSON.stringify({ error: "Monetbil service key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...params } = await req.json();

    if (action === "placePayment") {
      const { amount, phonenumber, operator, payment_id, tenant_name, email } = params;

      if (amount == null || Number(amount) <= 0 || !phonenumber) {
        return new Response(JSON.stringify({ error: "amount (> 0) and phonenumber are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const operatorCode = operator === "orange_money" ? "CM_ORANGEMONEY" : "CM_MTNMOBILEMONEY";

      const body = {
        service: serviceKey,
        phonenumber,
        amount: Number(amount),
        operator: operatorCode,
        currency: "XAF",
        country: "CM",
        payment_ref: payment_id || undefined,
        first_name: tenant_name || undefined,
        email: email || undefined,
      };

      const res = await fetch(`${MONETBIL_API_BASE}/placePayment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      console.log("Monetbil placePayment response:", JSON.stringify(data));

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "checkPayment") {
      const { paymentId } = params;

      if (!paymentId) {
        return new Response(JSON.stringify({ error: "paymentId is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const res = await fetch(`${MONETBIL_API_BASE}/checkPayment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });

      const data = await res.json();
      console.log("Monetbil checkPayment response:", JSON.stringify(data));

      // If payment succeeded, update the payment record in DB
      if (data?.transaction?.status === 1) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const paymentRef = data.transaction.payment_ref;
        if (paymentRef) {
          await supabase.from("payments").update({
            status: "paid",
            payment_method: data.transaction.mobile_operator_code === "CM_ORANGEMONEY" ? "orange_money" : "mtn_momo",
            paid_at: new Date().toISOString(),
            notes: `Monetbil TX: ${data.transaction.transaction_UUID || paymentId}`,
          }).eq("id", paymentRef);
        }
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use placePayment or checkPayment" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Monetbil edge function error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
