import{r as z,p as Ie,a as qe,c as x,o as Ve,f as m,e as p,h as s,d as Re,g as y,t as r,k,w as O,v as G,i as g,F as J,j as Be,l as I,D as Le}from"./vendor-vue-BTXF5RFs.js";import{u as ie,r as ae}from"./vendor-firebase-BGywcYca.js";import{d as oe}from"./errorHandler-DL3TJj_6.js";import{n as W,c as We}from"./addressParser-BwHQs41P.js";import{j as S}from"./deliverySync-nMFPF5Bd.js";import Ye from"./CustomerAddressModal-BZHWFFb5.js";import{S as T}from"./vendor-sweetalert-DE6NlnlT.js";import{_ as He}from"./_plugin-vue_export-helper-DlAUqK2U.js";const Ke={class:"slm-modal"},Qe={class:"slm-header no-print"},Ze={class:"slm-title"},Ge={class:"slm-count-badge"},Je={class:"slm-controls no-print"},Xe={class:"slm-filter-group"},et={class:"slm-customer-selector"},tt={class:"slm-selector-header"},nt={class:"slm-search-box"},st={class:"slm-quick-select-btns"},lt={class:"slm-chips-scroll"},it=["onClick","title"],at={class:"chip-checkbox"},ot={class:"chip-name"},dt={key:0,class:"chip-items"},rt=["onClick","title"],ct={key:0,class:"chip-active-lbl"},pt=["onClick","title"],ut=["onClick","title"],mt={key:2,class:"chip-warn-tag",title:"ยังไม่มีที่อยู่"},vt={key:0,class:"slm-no-chips"},ft={class:"slm-options-row"},ht={class:"slm-select-wrap"},gt={class:"slm-orient-tabs"},yt={class:"slm-select-wrap"},bt={class:"slm-select-wrap"},kt={style:{display:"flex",gap:"8px","flex-wrap":"wrap"}},$t={key:0,class:"slm-sender-box"},wt={class:"slm-sender-grid"},Ct={class:"slm-select-bar"},_t={style:{display:"flex","align-items":"center",gap:"12px","flex-wrap":"wrap"}},xt={class:"slm-check-all"},St=["checked"],At={key:0,class:"slm-addr-counter"},zt={class:"cnt-item has"},It={key:0,class:"cnt-item missing"},Bt={style:{display:"flex",gap:"8px"}},Lt=["disabled"],Tt={key:0,class:"slm-empty-state no-print"},Dt=["onClick"],Pt={class:"banner-text"},Nt={class:"highlight-label"},Et=["onClick"],Ot={key:1,class:"label-main-grid"},jt={class:"ls-sender-col"},Ft={class:"ls-sender-info"},Ut={class:"ls-sender-name"},Mt={class:"ls-sender-addr",style:{"white-space":"pre-line"}},qt={class:"ls-sender-phone"},Vt={class:"ls-bottom-left"},Rt=["title"],Wt=["onClick"],Yt=["onClick"],Ht={class:"ls-receiver-col"},Kt={class:"ls-receiver-name"},Qt={class:"ls-receiver-addr"},Zt={key:0,class:"ls-receiver-zip"},Gt={class:"zip-big"},Jt={class:"ls-receiver-phone"},Xt={key:2,class:"label-portrait-body"},en={class:"label-sender-block"},tn={class:"sender-body"},nn={class:"sender-name-line"},sn={class:"sender-addr-line",style:{"white-space":"pre-line"}},ln={class:"sender-phone-line"},an={class:"label-receiver-block"},on={class:"receiver-body"},dn={class:"receiver-name"},rn={class:"receiver-address"},cn={key:0,class:"receiver-zipcode"},pn={class:"zip-num"},un={class:"receiver-phone"},mn={class:"portrait-meta-bottom"},vn=["title"],fn=["onClick"],hn=["onClick"],gn={class:"label-thankyou-footer"},yn={__name:"ShippingLabelModal",props:{customers:{type:Array,default:()=>[]},addressBook:{type:Object,default:()=>({})},initialSelectedId:{type:String,default:null}},emits:["close"],setup(me){let D=null;const c=me,w=z("unprinted"),B=z("landscape"),j=z("thermal-76x130"),F=z(localStorage.getItem("manowzab_label_font_scale")||"preview"),X=z(!1),h=z([]),L=z(""),P=z(null);function Te(){localStorage.setItem("manowzab_label_font_scale",F.value)}const ve=x(()=>P.value?c.customers.find(n=>n.id===P.value.id)||P.value:null),u=z({name:localStorage.getItem("manowzab_sender_name")||"มะนาวแซ่บ",phone:localStorage.getItem("manowzab_sender_phone")||"095-155-5706",address:localStorage.getItem("manowzab_sender_address")||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000",thankYouText:localStorage.getItem("manowzab_sender_thankyou")||"🙏 ขอบคุณที่อุดหนุนนะคะ ❤️"});Ie(u,n=>{localStorage.setItem("manowzab_sender_name",n.name||""),localStorage.setItem("manowzab_sender_phone",n.phone||""),localStorage.setItem("manowzab_sender_address",n.address||""),localStorage.setItem("manowzab_sender_thankyou",n.thankYouText||"")},{deep:!0});function U(n){if(!n)return 1/0;const e=new Date;e.setHours(0,0,0,0);const t=new Date(n);return t.setHours(0,0,0,0),Math.ceil((t-e)/(1e3*60*60*24))}const A=x(()=>[...c.customers.filter(e=>c.initialSelectedId&&e.id===c.initialSelectedId?!0:e&&e.status!=="done"&&e.deliveryDate&&typeof e.deliveryDate=="string"&&e.deliveryDate.trim()!=="")].sort((e,t)=>{const a=U(e.deliveryDate),i=U(t.deliveryDate);return a!==i?a-i:(e.deliveryDate||"").localeCompare(t.deliveryDate||"")})),De=x(()=>A.value.filter(n=>!n.labelPrinted).length),fe=x(()=>A.value.filter(n=>U(n.deliveryDate)===0).length),he=x(()=>A.value.filter(n=>U(n.deliveryDate)===1).length),Pe=x(()=>A.value.length),C=x(()=>{let n=A.value;if(w.value==="unprinted"?n=A.value.filter(e=>!e.labelPrinted):w.value==="today"?n=A.value.filter(e=>U(e.deliveryDate)===0):w.value==="pack-tonight"&&(n=A.value.filter(e=>U(e.deliveryDate)===1)),c.initialSelectedId){const e=A.value.find(t=>t.id===c.initialSelectedId);e&&!n.some(t=>t.id===c.initialSelectedId)&&(n=[e,...n])}if(L.value.trim()){const e=L.value.trim().toLowerCase();n=n.filter(t=>{const a=(t.name||"").toLowerCase(),i=(t.recipientName||"").toLowerCase(),l=(q(t)||"").toLowerCase();return a.includes(e)||i.includes(e)||l.includes(e)})}return n}),b=x(()=>C.value.filter(n=>h.value.includes(n.id))),ge=x(()=>b.value.filter(n=>!!q(n)).length),ye=x(()=>b.value.length-ge.value),Ne=x(()=>C.value.length>0&&h.value.length===C.value.length);Ie(()=>c.initialSelectedId,n=>{n?(w.value="all-requested",h.value=[n],L.value=""):(w.value="all-requested",h.value=C.value.map(e=>e.id))},{immediate:!0}),qe(()=>{c.initialSelectedId?(w.value="all-requested",h.value=[c.initialSelectedId],L.value=""):fe.value>0?N("today"):he.value>0?N("pack-tonight"):N("all-requested")});function N(n){w.value=n,h.value=C.value.map(e=>e.id)}function Ee(n){n?h.value=C.value.map(e=>e.id):h.value=[]}function Oe(n){const e=h.value.indexOf(n);e>-1?h.value.splice(e,1):h.value.push(n)}async function je(n){const e=!n.labelPrinted;try{await ie(ae(oe,`delivery_customers/${n.id}`),{labelPrinted:e,labelPrintedAt:e?Date.now():null}),T.fire({icon:"success",title:e?`ทำเครื่องหมาย "${n.name}" พิมพ์แล้ว`:`ยกเลิกสถานะพิมพ์แล้วของ "${n.name}"`,toast:!0,position:"top-end",timer:1500,showConfirmButton:!1})}catch(t){console.error("Error updating printed status:",t)}}function M(n){if(!n)return[];const e=W(n.name).replace(/[.#$[\]/]/g,"_"),t=n.addresses,a=c.addressBook&&c.addressBook[e]?.addresses,i=t||a;let l=[];if(Array.isArray(i)?l=i.filter(Boolean):i&&typeof i=="object"&&(l=Object.values(i).filter(Boolean)),l.length>0)return l;if(n.address&&n.address.trim()){const o=H(n);return o&&o.address?[o]:[]}return[]}function Y(n){return M(n).length}function ee(n){if(!n)return"";const e=M(n);if(!e||e.length===0)return"";if(n.selectedAddressId){const t=e.find(a=>a.id===n.selectedAddressId);if(t)return t.label||(t.recipientName?`${t.recipientName}`:"")}if(n.address&&n.address.trim()){const t=n.address.trim(),a=e.find(i=>i.address&&i.address.trim()===t);if(a)return a.label||(a.recipientName?`${a.recipientName}`:"")}return e[0]?.label||""}function H(n){if(n.address)return{recipientName:n.recipientName||"",phone:n.phone||"",address:n.address||"",postalCode:n.postalCode||""};const e=W(n.name).replace(/[.#$[\]/]/g,"_");return c.addressBook&&c.addressBook[e]?c.addressBook[e]:{recipientName:"",phone:"",address:"",postalCode:""}}function K(n){if(n.recipientName&&n.recipientName.trim())return n.recipientName.trim();const e=H(n);return e&&e.recipientName&&e.recipientName.trim()?e.recipientName.trim():n.name}function Q(n){return H(n).phone}function q(n){return H(n).address}function E(n){const e=H(n);if(e.postalCode)return e.postalCode;const t=(e.address||"").match(/\b[1-9]\d{4}\b(?!\/|\d)/);return t?t[0]:""}function de(n){return We({rawAddress:q(n)||"",recipientName:K(n),phone:Q(n),postalCode:E(n)})}function re(n,e=15){const t=(n?.name||"-").trim();return t.length<=e?t:t.slice(0,e).trim()+"…"}function V(n){if(!n)return"";if(n.paymentType){const d=String(n.paymentType).trim().toLowerCase();if(d==="cod"||d==="ปลายทาง"||d==="เก็บเงินปลายทาง"||d==="เก็บปลายทาง")return"cod";if(d==="transfer"||d==="โอน"||d==="โอนเงิน")return"transfer"}const e=W(n.name).replace(/[.#$[\]/]/g,"_"),t=c.addressBook&&e?c.addressBook[e]:null;if(t&&t.paymentType){const d=String(t.paymentType).trim().toLowerCase();if(d==="cod"||d==="ปลายทาง"||d==="เก็บเงินปลายทาง"||d==="เก็บปลายทาง")return"cod";if(d==="transfer"||d==="โอน"||d==="โอนเงิน")return"transfer"}const a=M(n),i=n.selectedAddressId?a.find(d=>d.id===n.selectedAddressId):a[0];if(i&&i.paymentType){const d=String(i.paymentType).trim().toLowerCase();if(d==="cod"||d==="ปลายทาง"||d==="เก็บเงินปลายทาง"||d==="เก็บปลายทาง")return"cod";if(d==="transfer"||d==="โอน"||d==="โอนเงิน")return"transfer"}const l=(n.note||"").toLowerCase(),o=(n.address||"").toLowerCase();return l.includes("cod")||l.includes("ปลายทาง")||l.includes("เก็บเงิน")||o.includes("cod")||o.includes("ปลายทาง")?"cod":""}function Z(n){const e=V(n);if(e==="cod"){const t=(n?.note||"").match(/(?:cod|ปลายทาง)\s*[:=]?\s*(\d+)/i);return t&&t[1]?`COD (${t[1]}฿)`:"COD"}return e==="transfer"?"โอน":"ยังไม่ระบุ"}async function ce(n){if(!n)return;const e=V(n),t=e==="cod"?"transfer":e==="transfer"?"cod":"transfer";n.paymentType=t;const a=Date.now(),i=W(n.name).replace(/[.#$[\]/]/g,"_"),l={[`delivery_customers/${n.id}/paymentType`]:t,[`delivery_customers/${n.id}/updatedAt`]:a};i&&(l[`address_book/${i}/paymentType`]=t,l[`address_book/${i}/name`]=n.name.trim(),l[`address_book/${i}/updatedAt`]=a,c.addressBook&&c.addressBook[i]&&(c.addressBook[i].paymentType=t));const o=M(n);if(o.length>0){const d=o.map($=>({...$,paymentType:n.selectedAddressId&&$.id===n.selectedAddressId||o.length===1?t:$.paymentType||t}));l[`delivery_customers/${n.id}/addresses`]=d,i&&(l[`address_book/${i}/addresses`]=d)}try{await ie(ae(oe),l),T.fire({icon:"success",title:`บันทึกรูปแบบ "${n.name}" เป็น "${t==="cod"?"COD":"โอน"}" ไว้ในประวัติลูกค้าแล้ว`,toast:!0,position:"top-end",timer:1500,showConfirmButton:!1})}catch(d){console.error("Error toggling paymentType:",d)}}function be(n){if(!n)return"";if(n.contactChannel){const l=String(n.contactChannel).trim().toLowerCase();if(l==="lineoa"||l==="line_oa"||l==="line-oa")return"lineoa";if(l==="phone"||l==="tel"||l==="โทร"||l==="โทรศัพท์")return"phone";if(l==="line")return"line"}const e=W(n.name).replace(/[.#$[\]/]/g,"_"),t=c.addressBook&&e?c.addressBook[e]:null;if(t&&t.contactChannel){const l=String(t.contactChannel).trim().toLowerCase();if(l==="lineoa"||l==="line_oa"||l==="line-oa")return"lineoa";if(l==="phone"||l==="tel"||l==="โทร"||l==="โทรศัพท์")return"phone";if(l==="line")return"line"}const a=M(n),i=n.selectedAddressId?a.find(l=>l.id===n.selectedAddressId):a[0];if(i&&i.contactChannel){const l=String(i.contactChannel).trim().toLowerCase();if(l==="lineoa"||l==="line_oa"||l==="line-oa")return"lineoa";if(l==="phone"||l==="tel"||l==="โทร"||l==="โทรศัพท์")return"phone";if(l==="line")return"line"}return""}function pe(n){const e=be(n);return e==="lineoa"?"LineOA":e==="phone"?"โทร":e==="line"?"Line":"-"}async function ke(n){if(!n)return;const e=be(n),t=e==="line"?"lineoa":e==="lineoa"?"phone":"line";n.contactChannel=t;const a=Date.now(),i=W(n.name).replace(/[.#$[\]/]/g,"_"),l={[`delivery_customers/${n.id}/contactChannel`]:t,[`delivery_customers/${n.id}/updatedAt`]:a};i&&(l[`address_book/${i}/contactChannel`]=t,l[`address_book/${i}/name`]=n.name.trim(),l[`address_book/${i}/updatedAt`]=a,c.addressBook&&c.addressBook[i]&&(c.addressBook[i].contactChannel=t));const o=M(n);if(o.length>0){const d=o.map($=>({...$,contactChannel:n.selectedAddressId&&$.id===n.selectedAddressId||o.length===1?t:$.contactChannel||t}));l[`delivery_customers/${n.id}/addresses`]=d,i&&(l[`address_book/${i}/addresses`]=d)}try{await ie(ae(oe),l);const d=t==="lineoa"?"LineOA":t==="phone"?"โทรศัพท์":"Line";T.fire({icon:"success",title:`บันทึกช่องทางติดต่อ "${n.name}" เป็น "${d}" เรียบร้อย`,toast:!0,position:"top-end",timer:1500,showConfirmButton:!1})}catch(d){console.error("Error toggling contactChannel:",d)}}function Fe(){if(b.value.length===0)return;const n=document.getElementById("manowzab-label-print-frame");n&&n.remove();const e=B.value==="landscape";let t=76,a=130;j.value==="thermal-100x150"?(t=100,a=150):j.value==="thermal-80x100"&&(t=80,a=100);const i=e?`${a}mm`:`${t}mm`,l=e?`${t}mm`:`${a}mm`,o=document.createElement("iframe");o.id="manowzab-label-print-frame",o.style.position="fixed",o.style.left="-9999px",o.style.top="0",o.style.width=i,o.style.height=l,o.style.border="0",o.style.visibility="hidden",o.style.pointerEvents="none",o.style.zIndex="-9999",document.body.appendChild(o);const d=S(u.value.name||"มะนาวแซ่บ"),$=S(u.value.phone||"095-155-5706"),te=S(u.value.address||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000").replace(/\n/g,"<br>"),ne=S(u.value.thankYouText||"🙏 ขอบคุณที่อุดหนุนนะคะ ❤️"),ue=F.value==="compact"?.9:F.value==="large"?1.2:1,f=v=>`${(v*ue).toFixed(1)}pt`,Me=b.value.map(v=>{const _=K(v),R=de(v)||"⚠️ ยังไม่มีที่อยู่จัดส่ง",$e=S(_),we=S(R),le=S(E(v)),Ce=S(Q(v)||"-"),_e=S(Z(v)),xe=S(re(v)),Se=S(pe(v)),Ae=_.length>26?"name-long":"",ze=R.length>130?"addr-xlong":R.length>85?"addr-long":"";return e?`
          <div class="print-page">
            <div class="print-card landscape">
              <div class="card-grid">
                <!-- Left: Sender + Bottom-Left System Info -->
                <div class="ls-sender">
                  <div class="sender-top-info">
                    <div class="sender-name">${d}</div>
                    <div class="sender-addr">${te}</div>
                    <div class="sender-phone">โทร. ${$}</div>
                  </div>

                  <!-- 📌 Bottom-Left Meta on Printed Label (Plain Text) -->
                  <div class="ls-meta-bottom">
                    <div class="meta-system-name">${xe} (${Se})</div>
                    <div class="meta-payment-row">${_e}</div>
                  </div>
                </div>

                <!-- Right: Receiver -->
                <div class="ls-receiver">
                  <div class="receiver-name ${Ae}">${$e}</div>
                  <div class="receiver-addr ${ze}">${we}</div>
                  ${le?`<div class="receiver-zip">${le}</div>`:""}
                  <div class="receiver-phone">โทร ${Ce}</div>
                </div>
              </div>

              <!-- Thank you footer -->
              <div class="card-footer">${ne}</div>
            </div>
          </div>
        `:`
          <div class="print-page">
            <div class="print-card portrait">
              <div class="port-sender">
                <div class="sender-name">${d}</div>
                <div class="sender-addr">${te}</div>
                <div class="sender-phone">โทร. ${$}</div>
              </div>

              <div class="port-receiver">
                <div class="receiver-name ${Ae}">${$e}</div>
                <div class="receiver-addr ${ze}">${we}</div>
                ${le?`<div class="receiver-zip">${le}</div>`:""}
                <div class="receiver-phone">โทร ${Ce}</div>
              </div>

              <!-- Portrait Bottom-Left Meta (Plain Text) -->
              <div class="port-meta-bottom">
                <div class="meta-system-name">${xe} (${Se})</div>
                <div class="meta-payment-row">${_e}</div>
              </div>

              <div class="card-footer">${ne}</div>
            </div>
          </div>
        `}).join(""),se=o.contentWindow.document;se.open(),se.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>พิมพ์ใบปะหน้าพัสดุ - ${d}</title>
        <link id="label-font-link" href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;500;600;700&family=Sarabun:wght@500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page {
            size: ${i} ${l};
            margin: 0mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          html, body {
            width: ${i};
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: 'Sarabun', 'Kanit', 'Leelawadee UI', 'Tahoma', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            text-rendering: optimizeLegibility;
            -webkit-font-smoothing: antialiased;
          }
          .print-page {
            width: ${i};
            height: ${l};
            max-width: ${i};
            max-height: ${l};
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
            padding: 0;
            margin: 0;
            box-sizing: border-box;
            display: block;
            overflow: hidden;
          }
          .print-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .print-card {
            width: 100%;
            height: 100%;
            border: none;
            border-radius: 0;
            padding: 3.5mm 5.5mm 1.2mm 5.5mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #ffffff;
            color: #000000;
            box-sizing: border-box;
            overflow: hidden;
          }
          .card-grid {
            display: flex;
            width: 100%;
            gap: 4.5mm;
            flex: 1;
            min-height: 0;
          }
          .ls-sender {
            width: 33%;
            font-size: ${f(8.5)};
            line-height: 1.35;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding-top: 0.5mm;
            padding-bottom: 1.5mm;
          }
          .sender-top-info {
            display: flex;
            flex-direction: column;
          }
          .sender-name {
            font-size: ${f(10)};
            font-weight: 700;
            margin-bottom: 2px;
            line-height: 1.25;
          }
          .sender-addr {
            font-size: ${f(8.5)};
            font-weight: 500;
            margin-top: 2px;
            line-height: 1.35;
          }
          .sender-phone {
            font-size: ${f(8.5)};
            font-weight: 600;
            margin-top: 3px;
          }
          .ls-meta-bottom {
            margin-top: auto;
            padding-top: 1.5mm;
            display: flex;
            flex-direction: column;
            gap: 0.5mm;
            font-size: ${f(9)};
            line-height: 1.25;
          }
          .meta-system-name {
            font-size: ${f(9)};
            color: #000000;
            font-weight: 700;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 39mm;
          }
          .meta-payment-row {
            font-size: ${f(9.5)};
            color: #000000;
            font-weight: 800;
            letter-spacing: 0.3px;
          }
          .ls-receiver {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            padding-bottom: 5.5mm;
            padding-top: 0;
            padding-left: 0;
            word-break: break-word;
            overflow-wrap: break-word;
            min-width: 0;
          }
          .port-sender {
            font-size: ${f(8.5)};
            line-height: 1.35;
          }
          .port-receiver {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            padding-bottom: 7mm;
            padding-top: 0;
            word-break: break-word;
            overflow-wrap: break-word;
          }
          .port-meta-bottom {
            margin-top: auto;
            padding-top: 1.5mm;
            padding-bottom: 1.5mm;
            display: flex;
            flex-direction: column;
            gap: 0.5mm;
            font-size: ${f(9)};
            line-height: 1.25;
          }
          .port-meta-bottom .meta-system-name {
            max-width: 64mm;
          }
          .receiver-name {
            font-size: ${f(13.5)};
            font-weight: 700;
            line-height: 1.25;
            margin-bottom: 3px;
          }
          .receiver-name.name-long {
            font-size: ${f(11.5)};
          }
          .receiver-addr {
            font-size: ${f(11)};
            line-height: 1.38;
            font-weight: 600;
          }
          .receiver-addr.addr-long {
            font-size: ${f(9.8)};
            line-height: 1.34;
          }
          .receiver-addr.addr-xlong {
            font-size: ${f(8.8)};
            line-height: 1.3;
          }
          .receiver-zip {
            margin-top: 3px;
            font-size: ${f(14)};
            font-weight: 800;
            letter-spacing: 2px;
            line-height: 1.15;
          }
          .receiver-phone {
            font-size: ${f(11)};
            font-weight: 700;
            margin-top: 3px;
            line-height: 1.25;
          }
          .card-footer {
            text-align: center;
            font-size: ${f(9)};
            font-weight: 600;
            margin-top: auto;
            padding-top: 0;
            padding-bottom: 0.5mm;
          }
        </style>
      </head>
      <body>
        ${Me}
      </body>
    </html>
  `),se.close(),D&&clearTimeout(D),D=setTimeout(async()=>{try{const v=se.getElementById("label-font-link");v&&!v.sheet&&await Promise.race([new Promise(_=>{v.addEventListener("load",_,{once:!0}),v.addEventListener("error",_,{once:!0})}),new Promise(_=>setTimeout(_,800))]),o.contentWindow&&o.contentWindow.document.fonts&&await Promise.race([o.contentWindow.document.fonts.ready,new Promise(_=>setTimeout(_,800))])}catch{}o.contentWindow.focus(),o.contentWindow.print();try{const v={},_=Date.now();b.value.forEach(R=>{v[`delivery_customers/${R.id}/labelPrinted`]=!0,v[`delivery_customers/${R.id}/labelPrintedAt`]=_}),Object.keys(v).length>0&&await ie(ae(oe),v)}catch(v){console.error("Error auto-updating labelPrinted status:",v)}D=null},150)}Ve(()=>{D&&(clearTimeout(D),D=null);const n=document.getElementById("manowzab-label-print-frame");n&&n.remove(),typeof T<"u"&&T.isVisible()&&T.close()});function Ue(){if(b.value.length===0){T.fire({icon:"warning",title:"ไม่มีรายการที่เลือก",text:"กรุณาเลือกรายการลูกค้าที่ต้องการส่งออกก่อนครับ"});return}const n=[["ลำดับ","ชื่อผู้รับ (พิมพ์บนกล่อง)","ชื่อในระบบ (CF)","รูปแบบการส่ง","เบอร์โทร","ที่อยู่","รหัสไปรษณีย์","จำนวนสินค้า","รอบส่ง","โน้ต","ผู้ส่ง","เบอร์ผู้ส่ง","ที่อยู่ผู้ส่ง"]];b.value.forEach((o,d)=>{const $=K(o)||"",te=Q(o)||"",ne=q(o)||"",ue=E(o)||"",f=Z(o);n.push([d+1,`"${$.replace(/"/g,'""')}"`,`"${(o.name||"").replace(/"/g,'""')}"`,`"${f}"`,`"${te}"`,`"${ne.replace(/"/g,'""')}"`,`"${ue}"`,o.itemCount||0,o.deliveryDate||"",`"${(o.note||"").replace(/"/g,'""')}"`,`"${(u.value.name||"").replace(/"/g,'""')}"`,`"${(u.value.phone||"").replace(/"/g,'""')}"`,`"${(u.value.address||"").replace(/"/g,'""')}"`])});const e="\uFEFF"+n.map(o=>o.join(",")).join(`
`),t=new Blob([e],{type:"text/csv;charset=utf-8;"}),a=URL.createObjectURL(t),i=document.createElement("a"),l=new Date().toISOString().split("T")[0];i.setAttribute("href",a),i.setAttribute("download",`รายการที่อยู่จัดส่ง_130x76_${l}.csv`),document.body.appendChild(i),i.click(),document.body.removeChild(i),T.fire({icon:"success",title:"ส่งออกไฟล์สำเร็จ!",html:`
      <div style="text-align: left; font-size: 0.9em; line-height: 1.6;">
        ดาวน์โหลดไฟล์ <b>.csv</b> เรียบร้อยแล้ว<br>
        สามารถนำไฟล์นี้ไปกดเปิดในแอปเครื่องพิมพ์ (ปุ่ม <b>Excel</b>) เพื่อพิมพ์สติ๊กเกอร์รวดเดียวได้เลยครับ!
      </div>
    `,confirmButtonColor:"#3b82f6"})}return(n,e)=>(p(),m("div",{class:"slm-overlay",onClick:e[21]||(e[21]=I(t=>n.$emit("close"),["self"]))},[s("div",Ke,[s("div",Qe,[s("div",Ze,[e[22]||(e[22]=s("span",null,"🏷️ ใบปะหน้าพัสดุ 130x76 mm (แนวนอน)",-1)),s("span",Ge,r(b.value.length)+" รายการ",1)]),s("button",{class:"slm-close-btn",onClick:e[0]||(e[0]=t=>n.$emit("close")),title:"ปิด"},[...e[23]||(e[23]=[s("i",{class:"fa-solid fa-xmark"},null,-1)])])]),s("div",Je,[s("div",Xe,[s("button",{class:k(["slm-filter-btn",{active:w.value==="unprinted"}]),onClick:e[1]||(e[1]=t=>N("unprinted"))}," ⏳ ยังไม่พิมพ์ ("+r(De.value)+") ",3),s("button",{class:k(["slm-filter-btn",{active:w.value==="today"}]),onClick:e[2]||(e[2]=t=>N("today"))}," 🚨 ส่งวันนี้ ("+r(fe.value)+") ",3),s("button",{class:k(["slm-filter-btn",{active:w.value==="pack-tonight"}]),onClick:e[3]||(e[3]=t=>N("pack-tonight"))}," 📦 แพ็คคืนนี้ ("+r(he.value)+") ",3),s("button",{class:k(["slm-filter-btn",{active:w.value==="all-requested"}]),onClick:e[4]||(e[4]=t=>N("all-requested"))}," 🌐 ทั้งหมดที่รอส่ง ("+r(Pe.value)+") ",3)]),s("div",et,[s("div",tt,[s("div",nt,[e[24]||(e[24]=s("i",{class:"fa-solid fa-magnifying-glass slm-search-icon"},null,-1)),O(s("input",{type:"text","onUpdate:modelValue":e[5]||(e[5]=t=>L.value=t),class:"slm-search-input",placeholder:"🔍 ค้นหาชื่อลูกค้า / ผู้รับ (เช่น หนิง, ปิยะวาท)..."},null,512),[[G,L.value]]),L.value?(p(),m("button",{key:0,class:"slm-clear-search",onClick:e[6]||(e[6]=t=>L.value="")},"✕")):y("",!0)]),s("div",st,[s("button",{class:"slm-mini-btn",onClick:e[7]||(e[7]=t=>h.value=C.value.map(a=>a.id))},[...e[25]||(e[25]=[s("i",{class:"fa-solid fa-check-double"},null,-1),g(" เลือกทั้งหมด ",-1)])]),s("button",{class:"slm-mini-btn",onClick:e[8]||(e[8]=t=>h.value=[])},[...e[26]||(e[26]=[s("i",{class:"fa-solid fa-xmark"},null,-1),g(" ยกเลิกทั้งหมด ",-1)])]),s("button",{class:"slm-mini-btn highlight",onClick:e[9]||(e[9]=t=>h.value=C.value.filter(a=>!a.labelPrinted).map(a=>a.id))},[...e[27]||(e[27]=[s("i",{class:"fa-solid fa-filter"},null,-1),g(" เฉพาะที่ยังไม่พิมพ์ ",-1)])])])]),s("div",lt,[(p(!0),m(J,null,Be(C.value,t=>(p(),m("div",{key:t.id,class:k(["slm-cust-chip",{selected:h.value.includes(t.id),printed:t.labelPrinted,"no-address":!q(t)}]),onClick:a=>Oe(t.id),title:`คลิกเพื่อ ${h.value.includes(t.id)?"ยกเลิก":"เลือก"} ${t.name}`},[s("span",at,[s("i",{class:k(["fa-solid",h.value.includes(t.id)?"fa-square-check":"fa-square"])},null,2)]),s("span",ot,r(t.name),1),t.itemCount?(p(),m("span",dt,"("+r(t.itemCount)+" ชิ้น)",1)):y("",!0),Y(t)>1?(p(),m("span",{key:1,class:"chip-multi-addr-tag",onClick:I(a=>P.value=t,["stop"]),title:`ลูกค้ารายนี้มี ${Y(t)} ที่อยู่ (เลือก: ${ee(t)||"ที่อยู่นี้"}) — คลิกเพื่อเปลี่ยนที่อยู่จัดส่ง`},[e[28]||(e[28]=s("i",{class:"fa-solid fa-layer-group"},null,-1)),s("span",null,r(Y(t))+" ที่อยู่",1),ee(t)?(p(),m("span",ct,": "+r(ee(t)),1)):y("",!0)],8,rt)):y("",!0),s("span",{class:k(["chip-payment-tag",V(t)==="cod"?"is-cod":V(t)==="transfer"?"is-transfer":"is-unspecified"]),onClick:I(a=>ce(t),["stop"]),title:`รูปแบบจัดส่ง: ${Z(t)} (คลิกเพื่อสลับระหว่าง โอน / COD)`},[V(t)==="cod"?(p(),m(J,{key:0},[g("💵 COD")],64)):V(t)==="transfer"?(p(),m(J,{key:1},[g("💳 โอน")],64)):(p(),m(J,{key:2},[g("❓ ยังไม่ระบุ")],64))],10,pt),s("span",{class:k(["chip-status-tag",t.labelPrinted?"is-printed":"is-unprinted"]),onClick:I(a=>je(t),["stop"]),title:t.labelPrinted?"พิมพ์แล้ว (คลิกเพื่อเปลี่ยนเป็นยังไม่พิมพ์)":"ยังไม่พิมพ์ (คลิกเพื่อเปลี่ยนเป็นพิมพ์แล้ว)"},[s("i",{class:k(t.labelPrinted?"fa-solid fa-circle-check":"fa-solid fa-print")},null,2),g(" "+r(t.labelPrinted?"พิมพ์แล้ว":"ยังไม่พิมพ์"),1)],10,ut),q(t)?y("",!0):(p(),m("span",mt," ⚠️ รอที่อยู่ "))],10,it))),128)),C.value.length===0?(p(),m("div",vt," ไม่พบรายชื่อในหมวดนี้ ")):y("",!0)])]),s("div",ft,[s("div",ht,[e[29]||(e[29]=s("label",null,[s("i",{class:"fa-solid fa-rotate"}),g(" ทิศทาง:")],-1)),s("div",gt,[s("button",{class:k(["slm-orient-btn",{active:B.value==="landscape"}]),onClick:e[10]||(e[10]=t=>B.value="landscape")}," 🔄 แนวนอน (130x76mm) ",2),s("button",{class:k(["slm-orient-btn",{active:B.value==="portrait"}]),onClick:e[11]||(e[11]=t=>B.value="portrait")}," ↕️ แนวตั้ง (76x130mm) ",2)])]),s("div",yt,[e[31]||(e[31]=s("label",null,[s("i",{class:"fa-solid fa-scroll"}),g(" ขนาดฉลาก:")],-1)),O(s("select",{"onUpdate:modelValue":e[12]||(e[12]=t=>j.value=t),class:"slm-select"},[...e[30]||(e[30]=[s("option",{value:"thermal-76x130"},"สติ๊กเกอร์ 76 x 130 mm (มาตรฐานของคุณ)",-1),s("option",{value:"thermal-100x150"},'สติ๊กเกอร์ 100 x 150 mm (4x6")',-1),s("option",{value:"thermal-80x100"},"สติ๊กเกอร์ 80 x 100 mm",-1),s("option",{value:"a4-grid"},"กระดาษ A4 (สติ๊กเกอร์ 2 คอลัมน์)",-1)])],512),[[Le,j.value]])]),s("div",bt,[e[33]||(e[33]=s("label",null,[s("i",{class:"fa-solid fa-text-height"}),g(" ขนาดตัวหนังสือ:")],-1)),O(s("select",{"onUpdate:modelValue":e[13]||(e[13]=t=>F.value=t),class:"slm-select",onChange:Te},[...e[32]||(e[32]=[s("option",{value:"preview"},"พอดีตามพรีวิว (แนะนำ)",-1),s("option",{value:"compact"},"กะทัดรัด (ย่อ -10%)",-1),s("option",{value:"large"},"ตัวใหญ่ (+20%)",-1)])],544),[[Le,F.value]])]),s("div",kt,[s("button",{class:"slm-export-excel-btn",onClick:Ue,title:"ส่งออกไฟล์เพื่อนำเข้าไปเปิดในแอปเครื่องพิมพ์"},[...e[34]||(e[34]=[s("i",{class:"fa-solid fa-file-excel"},null,-1),g(" ส่งออก Excel เข้าแอปปริ้นเตอร์ ",-1)])]),s("button",{class:"slm-toggle-sender-btn",onClick:e[14]||(e[14]=t=>X.value=!X.value)},[e[35]||(e[35]=s("i",{class:"fa-solid fa-store"},null,-1)),g(" "+r(X.value?"ซ่อนข้อมูลร้าน":"แก้ไขข้อมูลร้านผู้ส่ง"),1)])])]),X.value?(p(),m("div",$t,[e[36]||(e[36]=s("div",{class:"slm-sender-title"},"🏠 ข้อมูลผู้ส่งและข้อความขอบคุณ (บันทึกจำไว้ในเครื่องอัตโนมัติ)",-1)),s("div",wt,[O(s("input",{type:"text","onUpdate:modelValue":e[15]||(e[15]=t=>u.value.name=t),class:"slm-input",placeholder:"ชื่อร้าน (เช่น มะนาวแซ่บ)"},null,512),[[G,u.value.name]]),O(s("input",{type:"text","onUpdate:modelValue":e[16]||(e[16]=t=>u.value.phone=t),class:"slm-input",placeholder:"เบอร์โทรผู้ส่ง"},null,512),[[G,u.value.phone]]),O(s("input",{type:"text","onUpdate:modelValue":e[17]||(e[17]=t=>u.value.address=t),class:"slm-input slm-col-span",placeholder:"ที่อยู่ผู้ส่ง (บ้านเลขที่ ตำบล อำเภอ จังหวัด รหัสไปรษณีย์)"},null,512),[[G,u.value.address]]),O(s("input",{type:"text","onUpdate:modelValue":e[18]||(e[18]=t=>u.value.thankYouText=t),class:"slm-input slm-col-span",placeholder:"ข้อความขอบคุณท้ายใบปะหน้า (เช่น 🙏 ขอบคุณที่อุดหนุนนะคะ ❤️)"},null,512),[[G,u.value.thankYouText]])])])):y("",!0),s("div",Ct,[s("div",_t,[s("label",xt,[s("input",{type:"checkbox",checked:Ne.value,onChange:e[19]||(e[19]=t=>Ee(t.target.checked))},null,40,St),s("span",null,"เลือก "+r(h.value.length)+" จาก "+r(C.value.length)+" คน",1)]),b.value.length>0?(p(),m("span",At,[s("span",zt,[e[37]||(e[37]=s("i",{class:"fa-solid fa-circle-check"},null,-1)),g(" มีที่อยู่ "+r(ge.value),1)]),ye.value>0?(p(),m("span",It,[e[38]||(e[38]=s("i",{class:"fa-solid fa-circle-exclamation"},null,-1)),g(" รอที่อยู่ "+r(ye.value),1)])):y("",!0)])):y("",!0)]),s("div",Bt,[s("button",{class:"btn btn-primary slm-print-btn",onClick:Fe,disabled:b.value.length===0},[e[39]||(e[39]=s("i",{class:"fa-solid fa-print"},null,-1)),g(" สั่งพิมพ์ใบปะหน้า ("+r(b.value.length)+" ใบ) ",1)],8,Lt)])])]),s("div",{class:k(["slm-preview-area",["paper-"+j.value,"mode-"+B.value]])},[b.value.length===0?(p(),m("div",Tt,[...e[40]||(e[40]=[s("i",{class:"fa-solid fa-box-open slm-empty-icon"},null,-1),s("div",null,"ไม่มีรายการที่เลือกพิมพ์ (กรุณาคลิกเลือกรายชื่อลูกค้าด้านบน)",-1)])])):y("",!0),(p(!0),m(J,null,Be(b.value,t=>(p(),m("div",{key:t.id,class:k(["shipping-label-card",["label-"+j.value,B.value==="landscape"?"layout-landscape":"layout-portrait","font-scale-"+F.value]])},[Y(t)>1?(p(),m("div",{key:0,class:"label-multi-addr-banner no-print",onClick:a=>P.value=t,title:"คลิกเพื่อสลับหรือเลือกที่อยู่จัดส่ง"},[s("div",Pt,[e[43]||(e[43]=s("i",{class:"fa-solid fa-layer-group"},null,-1)),s("span",null,[e[41]||(e[41]=g("มี ",-1)),s("b",null,r(Y(t))+" ที่อยู่",1),e[42]||(e[42]=g(" • กำลังเลือกส่งที่: ",-1)),s("b",Nt,r(ee(t)||"ที่อยู่นี้"),1)])]),s("button",{class:"banner-switch-btn",type:"button",onClick:I(a=>P.value=t,["stop"])},[...e[44]||(e[44]=[s("i",{class:"fa-solid fa-arrow-right-arrow-left"},null,-1),g(" สลับ/เลือกที่อยู่ ",-1)])],8,Et)],8,Dt)):y("",!0),B.value==="landscape"?(p(),m("div",Ot,[s("div",jt,[s("div",Ft,[s("div",Ut,r(u.value.name||"มะนาวแซ่บ"),1),s("div",Mt,r(u.value.address||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000"),1),s("div",qt,"โทร. "+r(u.value.phone||"095-155-5706"),1)]),s("div",Vt,[s("div",{class:"ls-meta-text system-name",title:`ชื่อลูกค้าในระบบ: ${t.name}`},[s("span",null,r(re(t)),1),s("span",{class:"ls-contact-tag",onClick:I(a=>ke(t),["stop"]),title:"คลิกเพื่อสลับช่องทางติดต่อ (Line / LineOA / โทร)"}," ("+r(pe(t))+") ",9,Wt)],8,Rt),s("div",{class:"ls-meta-text payment-text",onClick:I(a=>ce(t),["stop"]),title:"คลิกเพื่อสลับ โอน / COD"},r(Z(t)),9,Yt)])]),s("div",Ht,[s("div",Kt,r(K(t)),1),s("div",Qt,r(de(t)||"⚠️ ยังไม่มีที่อยู่จัดส่ง (กรุณานำเข้าจาก Note หรือพิมพ์เพิ่ม)"),1),E(t)?(p(),m("div",Zt,[s("span",Gt,r(E(t)),1)])):y("",!0),s("div",Jt," โทร "+r(Q(t)||"-"),1)])])):(p(),m("div",Xt,[s("div",en,[s("div",tn,[s("div",nn,r(u.value.name||"มะนาวแซ่บ"),1),s("div",sn,r(u.value.address||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000"),1),s("div",ln,"โทร. "+r(u.value.phone||"095-155-5706"),1)])]),s("div",an,[s("div",on,[s("div",dn,r(K(t)),1),s("div",rn,r(de(t)||"⚠️ ยังไม่มีที่อยู่จัดส่ง (กรุณานำเข้าจาก Note หรือพิมพ์เพิ่ม)"),1),E(t)?(p(),m("div",cn,[s("span",pn,r(E(t)),1)])):y("",!0),s("div",un," โทร "+r(Q(t)||"-"),1)])]),s("div",mn,[s("div",{class:"ls-meta-text system-name",title:`ชื่อลูกค้าในระบบ: ${t.name}`},[s("span",null,r(re(t)),1),s("span",{class:"ls-contact-tag",onClick:I(a=>ke(t),["stop"]),title:"คลิกเพื่อสลับช่องทางติดต่อ (Line / LineOA / โทร)"}," ("+r(pe(t))+") ",9,fn)],8,vn),s("div",{class:"ls-meta-text payment-text",onClick:I(a=>ce(t),["stop"]),title:"คลิกเพื่อสลับ โอน / COD"},r(Z(t)),9,hn)])])),s("div",gn,r(u.value.thankYouText||"🙏 ขอบคุณที่อุดหนุนนะคะ ❤️"),1)],2))),128))],2)]),ve.value?(p(),Re(Ye,{key:0,customer:ve.value,addressBook:me.addressBook,onClose:e[20]||(e[20]=t=>P.value=null)},null,8,["customer","addressBook"])):y("",!0)]))}},An=He(yn,[["__scopeId","data-v-68ee71c8"]]);export{An as default};
