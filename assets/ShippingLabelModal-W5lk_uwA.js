import{r as B,p as $e,a as xe,c as $,o as Ne,f as m,e as p,h as s,d as Ee,g,t as r,k as b,w as F,v as Q,i as h,F as Z,j as Ae,l as A,E as Oe}from"./vendor-vue-B2Dqwahp.js";import{u as ne,r as se}from"./vendor-firebase-BGywcYca.js";import{d as ie}from"./errorHandler-Cqh4DHGA.js";import{n as V,c as je}from"./addressParser-qdX8JMWO.js";import Ue from"./CustomerAddressModal-ecqtUbpK.js";import{S as I}from"./vendor-sweetalert-DE6NlnlT.js";import{_ as qe}from"./_plugin-vue_export-helper-DlAUqK2U.js";const Me={class:"slm-modal"},Fe={class:"slm-header no-print"},Ve={class:"slm-title"},We={class:"slm-count-badge"},Ye={class:"slm-controls no-print"},Re={class:"slm-filter-group"},He={class:"slm-customer-selector"},Ke={class:"slm-selector-header"},Qe={class:"slm-search-box"},Ze={class:"slm-quick-select-btns"},Ge={class:"slm-chips-scroll"},Je=["onClick","title"],Xe={class:"chip-checkbox"},et={class:"chip-name"},tt={key:0,class:"chip-items"},nt=["onClick","title"],st={key:0,class:"chip-active-lbl"},it=["onClick","title"],lt=["onClick","title"],at={key:2,class:"chip-warn-tag",title:"ยังไม่มีที่อยู่"},ot={key:0,class:"slm-no-chips"},dt={class:"slm-options-row"},rt={class:"slm-select-wrap"},ct={class:"slm-orient-tabs"},pt={class:"slm-select-wrap"},ut={style:{display:"flex",gap:"8px","flex-wrap":"wrap"}},mt={key:0,class:"slm-sender-box"},vt={class:"slm-sender-grid"},ft={class:"slm-select-bar"},ht={style:{display:"flex","align-items":"center",gap:"12px","flex-wrap":"wrap"}},gt={class:"slm-check-all"},yt=["checked"],bt={key:0,class:"slm-addr-counter"},kt={class:"cnt-item has"},Ct={key:0,class:"cnt-item missing"},wt={style:{display:"flex",gap:"8px"}},_t=["disabled"],$t={key:0,class:"slm-empty-state no-print"},xt=["onClick"],At={class:"banner-text"},St={class:"highlight-label"},zt=["onClick"],Bt={key:1,class:"label-main-grid"},It={class:"ls-sender-col"},Lt={class:"ls-sender-info"},Tt={class:"ls-sender-name"},Dt={class:"ls-sender-addr",style:{"white-space":"pre-line"}},Pt={class:"ls-sender-phone"},Nt={class:"ls-bottom-left"},Et=["title"],Ot=["onClick"],jt=["onClick"],Ut={class:"ls-receiver-col"},qt={class:"ls-receiver-name"},Mt={class:"ls-receiver-addr"},Ft={key:0,class:"ls-receiver-zip"},Vt={class:"zip-big"},Wt={class:"ls-receiver-phone"},Yt={key:2,class:"label-portrait-body"},Rt={class:"label-sender-block"},Ht={class:"sender-body"},Kt={class:"sender-name-line"},Qt={class:"sender-addr-line",style:{"white-space":"pre-line"}},Zt={class:"sender-phone-line"},Gt={class:"label-receiver-block"},Jt={class:"receiver-body"},Xt={class:"receiver-name"},en={class:"receiver-address"},tn={key:0,class:"receiver-zipcode"},nn={class:"zip-num"},sn={class:"receiver-phone"},ln={class:"portrait-meta-bottom"},an=["title"],on=["onClick"],dn=["onClick"],rn={class:"label-thankyou-footer"},cn={__name:"ShippingLabelModal",props:{customers:{type:Array,default:()=>[]},addressBook:{type:Object,default:()=>({})},initialSelectedId:{type:String,default:null}},emits:["close"],setup(ce){let L=null;const c=ce,k=B("unprinted"),S=B("landscape"),E=B("thermal-76x130"),G=B(!1),f=B([]),z=B(""),T=B(null),pe=$(()=>T.value?c.customers.find(n=>n.id===T.value.id)||T.value:null),u=B({name:localStorage.getItem("manowzab_sender_name")||"มะนาวแซ่บ",phone:localStorage.getItem("manowzab_sender_phone")||"095-155-5706",address:localStorage.getItem("manowzab_sender_address")||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000",thankYouText:localStorage.getItem("manowzab_sender_thankyou")||"🙏 ขอบคุณที่อุดหนุนนะคะ ❤️"});$e(u,n=>{localStorage.setItem("manowzab_sender_name",n.name||""),localStorage.setItem("manowzab_sender_phone",n.phone||""),localStorage.setItem("manowzab_sender_address",n.address||""),localStorage.setItem("manowzab_sender_thankyou",n.thankYouText||"")},{deep:!0});function O(n){if(!n)return 1/0;const e=new Date;e.setHours(0,0,0,0);const t=new Date(n);return t.setHours(0,0,0,0),Math.ceil((t-e)/(1e3*60*60*24))}const x=$(()=>[...c.customers.filter(e=>c.initialSelectedId&&e.id===c.initialSelectedId?!0:e&&e.status!=="done"&&e.deliveryDate&&typeof e.deliveryDate=="string"&&e.deliveryDate.trim()!=="")].sort((e,t)=>{const a=O(e.deliveryDate),l=O(t.deliveryDate);return a!==l?a-l:(e.deliveryDate||"").localeCompare(t.deliveryDate||"")})),Se=$(()=>x.value.filter(n=>!n.labelPrinted).length),ue=$(()=>x.value.filter(n=>O(n.deliveryDate)===0).length),me=$(()=>x.value.filter(n=>O(n.deliveryDate)===1).length),ze=$(()=>x.value.length),C=$(()=>{let n=x.value;if(k.value==="unprinted"?n=x.value.filter(e=>!e.labelPrinted):k.value==="today"?n=x.value.filter(e=>O(e.deliveryDate)===0):k.value==="pack-tonight"&&(n=x.value.filter(e=>O(e.deliveryDate)===1)),c.initialSelectedId){const e=x.value.find(t=>t.id===c.initialSelectedId);e&&!n.some(t=>t.id===c.initialSelectedId)&&(n=[e,...n])}if(z.value.trim()){const e=z.value.trim().toLowerCase();n=n.filter(t=>{const a=(t.name||"").toLowerCase(),l=(t.recipientName||"").toLowerCase(),i=(U(t)||"").toLowerCase();return a.includes(e)||l.includes(e)||i.includes(e)})}return n}),y=$(()=>C.value.filter(n=>f.value.includes(n.id))),ve=$(()=>y.value.filter(n=>!!U(n)).length),fe=$(()=>y.value.length-ve.value),Be=$(()=>C.value.length>0&&f.value.length===C.value.length);$e(()=>c.initialSelectedId,n=>{n?(k.value="all-requested",f.value=[n],z.value=""):(k.value="all-requested",f.value=C.value.map(e=>e.id))},{immediate:!0}),xe(()=>{c.initialSelectedId?(k.value="all-requested",f.value=[c.initialSelectedId],z.value=""):(k.value="all-requested",f.value=C.value.map(n=>n.id))});function D(n){k.value=n,f.value=C.value.map(e=>e.id)}function Ie(n){n?f.value=C.value.map(e=>e.id):f.value=[]}function Le(n){const e=f.value.indexOf(n);e>-1?f.value.splice(e,1):f.value.push(n)}async function Te(n){const e=!n.labelPrinted;try{await ne(se(ie,`delivery_customers/${n.id}`),{labelPrinted:e,labelPrintedAt:e?Date.now():null}),I.fire({icon:"success",title:e?`ทำเครื่องหมาย "${n.name}" พิมพ์แล้ว`:`ยกเลิกสถานะพิมพ์แล้วของ "${n.name}"`,toast:!0,position:"top-end",timer:1500,showConfirmButton:!1})}catch(t){console.error("Error updating printed status:",t)}}function j(n){if(!n)return[];const e=V(n.name).replace(/[.#$[\]/]/g,"_"),t=n.addresses,a=c.addressBook&&c.addressBook[e]?.addresses,l=t||a;let i=[];if(Array.isArray(l)?i=l.filter(Boolean):l&&typeof l=="object"&&(i=Object.values(l).filter(Boolean)),i.length>0)return i;if(n.address&&n.address.trim()){const o=Y(n);return o&&o.address?[o]:[]}return[]}function W(n){return j(n).length}function J(n){if(!n)return"";const e=j(n);if(!e||e.length===0)return"";if(n.selectedAddressId){const t=e.find(a=>a.id===n.selectedAddressId);if(t)return t.label||(t.recipientName?`${t.recipientName}`:"")}if(n.address&&n.address.trim()){const t=n.address.trim(),a=e.find(l=>l.address&&l.address.trim()===t);if(a)return a.label||(a.recipientName?`${a.recipientName}`:"")}return e[0]?.label||""}function Y(n){if(n.address)return{recipientName:n.recipientName||"",phone:n.phone||"",address:n.address||"",postalCode:n.postalCode||""};const e=V(n.name).replace(/[.#$[\]/]/g,"_");return c.addressBook&&c.addressBook[e]?c.addressBook[e]:{recipientName:"",phone:"",address:"",postalCode:""}}function R(n){if(n.recipientName&&n.recipientName.trim())return n.recipientName.trim();const e=Y(n);return e&&e.recipientName&&e.recipientName.trim()?e.recipientName.trim():n.name}function H(n){return Y(n).phone}function U(n){return Y(n).address}function P(n){const e=Y(n);if(e.postalCode)return e.postalCode;const t=(e.address||"").match(/\b[1-9]\d{4}\b(?!\/|\d)/);return t?t[0]:""}function le(n){return je({rawAddress:U(n)||"",recipientName:R(n),phone:H(n),postalCode:P(n)})}function ae(n,e=15){const t=(n?.name||"-").trim();return t.length<=e?t:t.slice(0,e).trim()+"…"}function q(n){if(!n)return"";if(n.paymentType){const d=String(n.paymentType).trim().toLowerCase();if(d==="cod"||d==="ปลายทาง"||d==="เก็บเงินปลายทาง"||d==="เก็บปลายทาง")return"cod";if(d==="transfer"||d==="โอน"||d==="โอนเงิน")return"transfer"}const e=V(n.name).replace(/[.#$[\]/]/g,"_"),t=c.addressBook&&e?c.addressBook[e]:null;if(t&&t.paymentType){const d=String(t.paymentType).trim().toLowerCase();if(d==="cod"||d==="ปลายทาง"||d==="เก็บเงินปลายทาง"||d==="เก็บปลายทาง")return"cod";if(d==="transfer"||d==="โอน"||d==="โอนเงิน")return"transfer"}const a=j(n),l=n.selectedAddressId?a.find(d=>d.id===n.selectedAddressId):a[0];if(l&&l.paymentType){const d=String(l.paymentType).trim().toLowerCase();if(d==="cod"||d==="ปลายทาง"||d==="เก็บเงินปลายทาง"||d==="เก็บปลายทาง")return"cod";if(d==="transfer"||d==="โอน"||d==="โอนเงิน")return"transfer"}const i=(n.note||"").toLowerCase(),o=(n.address||"").toLowerCase();return i.includes("cod")||i.includes("ปลายทาง")||i.includes("เก็บเงิน")||o.includes("cod")||o.includes("ปลายทาง")?"cod":""}function K(n){const e=q(n);if(e==="cod"){const t=(n?.note||"").match(/(?:cod|ปลายทาง)\s*[:=]?\s*(\d+)/i);return t&&t[1]?`COD (${t[1]}฿)`:"COD"}return e==="transfer"?"โอน":"ยังไม่ระบุ"}async function oe(n){if(!n)return;const e=q(n),t=e==="cod"?"transfer":e==="transfer"?"cod":"transfer";n.paymentType=t;const a=Date.now(),l=V(n.name).replace(/[.#$[\]/]/g,"_"),i={[`delivery_customers/${n.id}/paymentType`]:t,[`delivery_customers/${n.id}/updatedAt`]:a};l&&(i[`address_book/${l}/paymentType`]=t,i[`address_book/${l}/name`]=n.name.trim(),i[`address_book/${l}/updatedAt`]=a,c.addressBook&&c.addressBook[l]&&(c.addressBook[l].paymentType=t));const o=j(n);if(o.length>0){const d=o.map(w=>({...w,paymentType:n.selectedAddressId&&w.id===n.selectedAddressId||o.length===1?t:w.paymentType||t}));i[`delivery_customers/${n.id}/addresses`]=d,l&&(i[`address_book/${l}/addresses`]=d)}try{await ne(se(ie),i),I.fire({icon:"success",title:`บันทึกรูปแบบ "${n.name}" เป็น "${t==="cod"?"COD":"โอน"}" ไว้ในประวัติลูกค้าแล้ว`,toast:!0,position:"top-end",timer:1500,showConfirmButton:!1})}catch(d){console.error("Error toggling paymentType:",d)}}function he(n){if(!n)return"";if(n.contactChannel){const i=String(n.contactChannel).trim().toLowerCase();if(i==="lineoa"||i==="line_oa"||i==="line-oa")return"lineoa";if(i==="phone"||i==="tel"||i==="โทร"||i==="โทรศัพท์")return"phone";if(i==="line")return"line"}const e=V(n.name).replace(/[.#$[\]/]/g,"_"),t=c.addressBook&&e?c.addressBook[e]:null;if(t&&t.contactChannel){const i=String(t.contactChannel).trim().toLowerCase();if(i==="lineoa"||i==="line_oa"||i==="line-oa")return"lineoa";if(i==="phone"||i==="tel"||i==="โทร"||i==="โทรศัพท์")return"phone";if(i==="line")return"line"}const a=j(n),l=n.selectedAddressId?a.find(i=>i.id===n.selectedAddressId):a[0];if(l&&l.contactChannel){const i=String(l.contactChannel).trim().toLowerCase();if(i==="lineoa"||i==="line_oa"||i==="line-oa")return"lineoa";if(i==="phone"||i==="tel"||i==="โทร"||i==="โทรศัพท์")return"phone";if(i==="line")return"line"}return""}function de(n){const e=he(n);return e==="lineoa"?"LineOA":e==="phone"?"โทร":e==="line"?"Line":"-"}async function ge(n){if(!n)return;const e=he(n),t=e==="line"?"lineoa":e==="lineoa"?"phone":"line";n.contactChannel=t;const a=Date.now(),l=V(n.name).replace(/[.#$[\]/]/g,"_"),i={[`delivery_customers/${n.id}/contactChannel`]:t,[`delivery_customers/${n.id}/updatedAt`]:a};l&&(i[`address_book/${l}/contactChannel`]=t,i[`address_book/${l}/name`]=n.name.trim(),i[`address_book/${l}/updatedAt`]=a,c.addressBook&&c.addressBook[l]&&(c.addressBook[l].contactChannel=t));const o=j(n);if(o.length>0){const d=o.map(w=>({...w,contactChannel:n.selectedAddressId&&w.id===n.selectedAddressId||o.length===1?t:w.contactChannel||t}));i[`delivery_customers/${n.id}/addresses`]=d,l&&(i[`address_book/${l}/addresses`]=d)}try{await ne(se(ie),i);const d=t==="lineoa"?"LineOA":t==="phone"?"โทรศัพท์":"Line";I.fire({icon:"success",title:`บันทึกช่องทางติดต่อ "${n.name}" เป็น "${d}" เรียบร้อย`,toast:!0,position:"top-end",timer:1500,showConfirmButton:!1})}catch(d){console.error("Error toggling contactChannel:",d)}}function De(){if(y.value.length===0)return;const n=document.getElementById("manowzab-label-print-frame");n&&n.remove();const e=S.value==="landscape";let t=76,a=130;E.value==="thermal-100x150"?(t=100,a=150):E.value==="thermal-80x100"&&(t=80,a=100);const l=e?`${a}mm`:`${t}mm`,i=e?`${t}mm`:`${a}mm`,o=document.createElement("iframe");o.id="manowzab-label-print-frame",o.style.position="fixed",o.style.left="-9999px",o.style.top="0",o.style.width=l,o.style.height=i,o.style.border="0",o.style.visibility="hidden",o.style.pointerEvents="none",o.style.zIndex="-9999",document.body.appendChild(o);const d=u.value.name||"มะนาวแซ่บ",w=u.value.phone||"095-155-5706",X=(u.value.address||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000").replace(/\n/g,"<br>"),ee=u.value.thankYouText||"🙏 ขอบคุณที่อุดหนุนนะคะ ❤️",re=y.value.map(v=>{const _=R(v),N=le(v)||"⚠️ ยังไม่มีที่อยู่จัดส่ง",te=P(v),ye=H(v)||"-",be=K(v),ke=ae(v),Ce=de(v),we=_.length>26?"name-long":"",_e=N.length>130?"addr-xlong":N.length>85?"addr-long":"";return e?`
          <div class="print-page">
            <div class="print-card landscape">
              <div class="card-grid">
                <!-- Left: Sender + Bottom-Left System Info -->
                <div class="ls-sender">
                  <div class="sender-top-info">
                    <div class="sender-name">${d}</div>
                    <div class="sender-addr">${X}</div>
                    <div class="sender-phone">โทร. ${w}</div>
                  </div>

                  <!-- 📌 Bottom-Left Meta on Printed Label (Plain Text) -->
                  <div class="ls-meta-bottom">
                    <div class="meta-system-name">${ke} (${Ce})</div>
                    <div class="meta-payment-row">${be}</div>
                  </div>
                </div>

                <!-- Right: Receiver -->
                <div class="ls-receiver">
                  <div class="receiver-name ${we}">${_}</div>
                  <div class="receiver-addr ${_e}">${N}</div>
                  ${te?`<div class="receiver-zip">${te}</div>`:""}
                  <div class="receiver-phone">โทร ${ye}</div>
                </div>
              </div>

              <!-- Thank you footer -->
              <div class="card-footer">${ee}</div>
            </div>
          </div>
        `:`
          <div class="print-page">
            <div class="print-card portrait">
              <div class="port-sender">
                <div class="sender-name">${d}</div>
                <div class="sender-addr">${X}</div>
                <div class="sender-phone">โทร. ${w}</div>
              </div>

              <div class="port-receiver">
                <div class="receiver-name ${we}">${_}</div>
                <div class="receiver-addr ${_e}">${N}</div>
                ${te?`<div class="receiver-zip">${te}</div>`:""}
                <div class="receiver-phone">โทร ${ye}</div>
              </div>

              <!-- Portrait Bottom-Left Meta (Plain Text) -->
              <div class="port-meta-bottom">
                <div class="meta-system-name">${ke} (${Ce})</div>
                <div class="meta-payment-row">${be}</div>
              </div>

              <div class="card-footer">${ee}</div>
            </div>
          </div>
        `}).join(""),M=o.contentWindow.document;M.open(),M.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>พิมพ์ใบปะหน้าพัสดุ - ${d}</title>
        <link id="label-font-link" href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;500;600;700&family=Sarabun:wght@500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page {
            size: ${l} ${i};
            margin: 0mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          html, body {
            width: ${l};
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
            width: ${l};
            height: ${i};
            max-width: ${l};
            max-height: ${i};
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
            font-size: 9.5pt;
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
            font-size: 12pt;
            font-weight: 700;
            margin-bottom: 2px;
            line-height: 1.25;
          }
          .sender-addr {
            font-size: 9.5pt;
            font-weight: 500;
            margin-top: 2px;
            line-height: 1.35;
          }
          .sender-phone {
            font-size: 10pt;
            font-weight: 600;
            margin-top: 3px;
          }
          .ls-meta-bottom {
            margin-top: auto;
            padding-top: 1.5mm;
            display: flex;
            flex-direction: column;
            gap: 0.5mm;
            font-size: 11pt;
            line-height: 1.25;
          }
          .meta-system-name {
            font-size: 11pt;
            color: #000000;
            font-weight: 700;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 39mm;
          }
          .meta-payment-row {
            font-size: 12.5pt;
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
            font-size: 9.5pt;
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
            font-size: 11pt;
            line-height: 1.25;
          }
          .port-meta-bottom .meta-system-name {
            max-width: 64mm;
          }
          .receiver-name {
            font-size: 16.5pt;
            font-weight: 700;
            line-height: 1.25;
            margin-bottom: 3px;
          }
          .receiver-name.name-long {
            font-size: 14.5pt;
          }
          .receiver-addr {
            font-size: 13.5pt;
            line-height: 1.38;
            font-weight: 600;
          }
          .receiver-addr.addr-long {
            font-size: 12pt;
            line-height: 1.34;
          }
          .receiver-addr.addr-xlong {
            font-size: 11pt;
            line-height: 1.3;
          }
          .receiver-zip {
            margin-top: 3px;
            font-size: 18pt;
            font-weight: 800;
            letter-spacing: 2px;
            line-height: 1.15;
          }
          .receiver-phone {
            font-size: 13.5pt;
            font-weight: 700;
            margin-top: 3px;
            line-height: 1.25;
          }
          .card-footer {
            text-align: center;
            font-size: 10pt;
            font-weight: 600;
            margin-top: auto;
            padding-top: 0;
            padding-bottom: 0.5mm;
          }
        </style>
      </head>
      <body>
        ${re}
      </body>
    </html>
  `),M.close(),L&&clearTimeout(L),L=setTimeout(async()=>{try{const v=M.getElementById("label-font-link");v&&!v.sheet&&await Promise.race([new Promise(_=>{v.addEventListener("load",_,{once:!0}),v.addEventListener("error",_,{once:!0})}),new Promise(_=>setTimeout(_,800))]),o.contentWindow&&o.contentWindow.document.fonts&&await Promise.race([o.contentWindow.document.fonts.ready,new Promise(_=>setTimeout(_,800))])}catch{}o.contentWindow.focus(),o.contentWindow.print();try{const v={},_=Date.now();y.value.forEach(N=>{v[`delivery_customers/${N.id}/labelPrinted`]=!0,v[`delivery_customers/${N.id}/labelPrintedAt`]=_}),Object.keys(v).length>0&&await ne(se(ie),v)}catch(v){console.error("Error auto-updating labelPrinted status:",v)}L=null},150)}Ne(()=>{L&&(clearTimeout(L),L=null);const n=document.getElementById("manowzab-label-print-frame");n&&n.remove(),typeof I<"u"&&I.isVisible()&&I.close()});function Pe(){if(y.value.length===0){I.fire({icon:"warning",title:"ไม่มีรายการที่เลือก",text:"กรุณาเลือกรายการลูกค้าที่ต้องการส่งออกก่อนครับ"});return}const n=[["ลำดับ","ชื่อผู้รับ (พิมพ์บนกล่อง)","ชื่อในระบบ (CF)","รูปแบบการส่ง","เบอร์โทร","ที่อยู่","รหัสไปรษณีย์","จำนวนสินค้า","รอบส่ง","โน้ต","ผู้ส่ง","เบอร์ผู้ส่ง","ที่อยู่ผู้ส่ง"]];y.value.forEach((o,d)=>{const w=R(o)||"",X=H(o)||"",ee=U(o)||"",re=P(o)||"",M=K(o);n.push([d+1,`"${w.replace(/"/g,'""')}"`,`"${(o.name||"").replace(/"/g,'""')}"`,`"${M}"`,`"${X}"`,`"${ee.replace(/"/g,'""')}"`,`"${re}"`,o.itemCount||0,o.deliveryDate||"",`"${(o.note||"").replace(/"/g,'""')}"`,`"${(u.value.name||"").replace(/"/g,'""')}"`,`"${(u.value.phone||"").replace(/"/g,'""')}"`,`"${(u.value.address||"").replace(/"/g,'""')}"`])});const e="\uFEFF"+n.map(o=>o.join(",")).join(`
`),t=new Blob([e],{type:"text/csv;charset=utf-8;"}),a=URL.createObjectURL(t),l=document.createElement("a"),i=new Date().toISOString().split("T")[0];l.setAttribute("href",a),l.setAttribute("download",`รายการที่อยู่จัดส่ง_130x76_${i}.csv`),document.body.appendChild(l),l.click(),document.body.removeChild(l),I.fire({icon:"success",title:"ส่งออกไฟล์สำเร็จ!",html:`
      <div style="text-align: left; font-size: 0.9em; line-height: 1.6;">
        ดาวน์โหลดไฟล์ <b>.csv</b> เรียบร้อยแล้ว<br>
        สามารถนำไฟล์นี้ไปกดเปิดในแอปเครื่องพิมพ์ (ปุ่ม <b>Excel</b>) เพื่อพิมพ์สติ๊กเกอร์รวดเดียวได้เลยครับ!
      </div>
    `,confirmButtonColor:"#3b82f6"})}return xe(()=>{ue.value>0?D("today"):me.value>0?D("pack-tonight"):D("all-requested")}),(n,e)=>(p(),m("div",{class:"slm-overlay",onClick:e[20]||(e[20]=A(t=>n.$emit("close"),["self"]))},[s("div",Me,[s("div",Fe,[s("div",Ve,[e[21]||(e[21]=s("span",null,"🏷️ ใบปะหน้าพัสดุ 130x76 mm (แนวนอน)",-1)),s("span",We,r(y.value.length)+" รายการ",1)]),s("button",{class:"slm-close-btn",onClick:e[0]||(e[0]=t=>n.$emit("close")),title:"ปิด"},[...e[22]||(e[22]=[s("i",{class:"fa-solid fa-xmark"},null,-1)])])]),s("div",Ye,[s("div",Re,[s("button",{class:b(["slm-filter-btn",{active:k.value==="unprinted"}]),onClick:e[1]||(e[1]=t=>D("unprinted"))}," ⏳ ยังไม่พิมพ์ ("+r(Se.value)+") ",3),s("button",{class:b(["slm-filter-btn",{active:k.value==="today"}]),onClick:e[2]||(e[2]=t=>D("today"))}," 🚨 ส่งวันนี้ ("+r(ue.value)+") ",3),s("button",{class:b(["slm-filter-btn",{active:k.value==="pack-tonight"}]),onClick:e[3]||(e[3]=t=>D("pack-tonight"))}," 📦 แพ็คคืนนี้ ("+r(me.value)+") ",3),s("button",{class:b(["slm-filter-btn",{active:k.value==="all-requested"}]),onClick:e[4]||(e[4]=t=>D("all-requested"))}," 🌐 ทั้งหมดที่รอส่ง ("+r(ze.value)+") ",3)]),s("div",He,[s("div",Ke,[s("div",Qe,[e[23]||(e[23]=s("i",{class:"fa-solid fa-magnifying-glass slm-search-icon"},null,-1)),F(s("input",{type:"text","onUpdate:modelValue":e[5]||(e[5]=t=>z.value=t),class:"slm-search-input",placeholder:"🔍 ค้นหาชื่อลูกค้า / ผู้รับ (เช่น หนิง, ปิยะวาท)..."},null,512),[[Q,z.value]]),z.value?(p(),m("button",{key:0,class:"slm-clear-search",onClick:e[6]||(e[6]=t=>z.value="")},"✕")):g("",!0)]),s("div",Ze,[s("button",{class:"slm-mini-btn",onClick:e[7]||(e[7]=t=>f.value=C.value.map(a=>a.id))},[...e[24]||(e[24]=[s("i",{class:"fa-solid fa-check-double"},null,-1),h(" เลือกทั้งหมด ",-1)])]),s("button",{class:"slm-mini-btn",onClick:e[8]||(e[8]=t=>f.value=[])},[...e[25]||(e[25]=[s("i",{class:"fa-solid fa-xmark"},null,-1),h(" ยกเลิกทั้งหมด ",-1)])]),s("button",{class:"slm-mini-btn highlight",onClick:e[9]||(e[9]=t=>f.value=C.value.filter(a=>!a.labelPrinted).map(a=>a.id))},[...e[26]||(e[26]=[s("i",{class:"fa-solid fa-filter"},null,-1),h(" เฉพาะที่ยังไม่พิมพ์ ",-1)])])])]),s("div",Ge,[(p(!0),m(Z,null,Ae(C.value,t=>(p(),m("div",{key:t.id,class:b(["slm-cust-chip",{selected:f.value.includes(t.id),printed:t.labelPrinted,"no-address":!U(t)}]),onClick:a=>Le(t.id),title:`คลิกเพื่อ ${f.value.includes(t.id)?"ยกเลิก":"เลือก"} ${t.name}`},[s("span",Xe,[s("i",{class:b(["fa-solid",f.value.includes(t.id)?"fa-square-check":"fa-square"])},null,2)]),s("span",et,r(t.name),1),t.itemCount?(p(),m("span",tt,"("+r(t.itemCount)+" ชิ้น)",1)):g("",!0),W(t)>1?(p(),m("span",{key:1,class:"chip-multi-addr-tag",onClick:A(a=>T.value=t,["stop"]),title:`ลูกค้ารายนี้มี ${W(t)} ที่อยู่ (เลือก: ${J(t)||"ที่อยู่นี้"}) — คลิกเพื่อเปลี่ยนที่อยู่จัดส่ง`},[e[27]||(e[27]=s("i",{class:"fa-solid fa-layer-group"},null,-1)),s("span",null,r(W(t))+" ที่อยู่",1),J(t)?(p(),m("span",st,": "+r(J(t)),1)):g("",!0)],8,nt)):g("",!0),s("span",{class:b(["chip-payment-tag",q(t)==="cod"?"is-cod":q(t)==="transfer"?"is-transfer":"is-unspecified"]),onClick:A(a=>oe(t),["stop"]),title:`รูปแบบจัดส่ง: ${K(t)} (คลิกเพื่อสลับระหว่าง โอน / COD)`},[q(t)==="cod"?(p(),m(Z,{key:0},[h("💵 COD")],64)):q(t)==="transfer"?(p(),m(Z,{key:1},[h("💳 โอน")],64)):(p(),m(Z,{key:2},[h("❓ ยังไม่ระบุ")],64))],10,it),s("span",{class:b(["chip-status-tag",t.labelPrinted?"is-printed":"is-unprinted"]),onClick:A(a=>Te(t),["stop"]),title:t.labelPrinted?"พิมพ์แล้ว (คลิกเพื่อเปลี่ยนเป็นยังไม่พิมพ์)":"ยังไม่พิมพ์ (คลิกเพื่อเปลี่ยนเป็นพิมพ์แล้ว)"},[s("i",{class:b(t.labelPrinted?"fa-solid fa-circle-check":"fa-solid fa-print")},null,2),h(" "+r(t.labelPrinted?"พิมพ์แล้ว":"ยังไม่พิมพ์"),1)],10,lt),U(t)?g("",!0):(p(),m("span",at," ⚠️ รอที่อยู่ "))],10,Je))),128)),C.value.length===0?(p(),m("div",ot," ไม่พบรายชื่อในหมวดนี้ ")):g("",!0)])]),s("div",dt,[s("div",rt,[e[28]||(e[28]=s("label",null,[s("i",{class:"fa-solid fa-rotate"}),h(" ทิศทาง:")],-1)),s("div",ct,[s("button",{class:b(["slm-orient-btn",{active:S.value==="landscape"}]),onClick:e[10]||(e[10]=t=>S.value="landscape")}," 🔄 แนวนอน (130x76mm) ",2),s("button",{class:b(["slm-orient-btn",{active:S.value==="portrait"}]),onClick:e[11]||(e[11]=t=>S.value="portrait")}," ↕️ แนวตั้ง (76x130mm) ",2)])]),s("div",pt,[e[30]||(e[30]=s("label",null,[s("i",{class:"fa-solid fa-scroll"}),h(" ขนาดฉลาก:")],-1)),F(s("select",{"onUpdate:modelValue":e[12]||(e[12]=t=>E.value=t),class:"slm-select"},[...e[29]||(e[29]=[s("option",{value:"thermal-76x130"},"สติ๊กเกอร์ 76 x 130 mm (มาตรฐานของคุณ)",-1),s("option",{value:"thermal-100x150"},'สติ๊กเกอร์ 100 x 150 mm (4x6")',-1),s("option",{value:"thermal-80x100"},"สติ๊กเกอร์ 80 x 100 mm",-1),s("option",{value:"a4-grid"},"กระดาษ A4 (สติ๊กเกอร์ 2 คอลัมน์)",-1)])],512),[[Oe,E.value]])]),s("div",ut,[s("button",{class:"slm-export-excel-btn",onClick:Pe,title:"ส่งออกไฟล์เพื่อนำเข้าไปเปิดในแอปเครื่องพิมพ์"},[...e[31]||(e[31]=[s("i",{class:"fa-solid fa-file-excel"},null,-1),h(" ส่งออก Excel เข้าแอปปริ้นเตอร์ ",-1)])]),s("button",{class:"slm-toggle-sender-btn",onClick:e[13]||(e[13]=t=>G.value=!G.value)},[e[32]||(e[32]=s("i",{class:"fa-solid fa-store"},null,-1)),h(" "+r(G.value?"ซ่อนข้อมูลร้าน":"แก้ไขข้อมูลร้านผู้ส่ง"),1)])])]),G.value?(p(),m("div",mt,[e[33]||(e[33]=s("div",{class:"slm-sender-title"},"🏠 ข้อมูลผู้ส่งและข้อความขอบคุณ (บันทึกจำไว้ในเครื่องอัตโนมัติ)",-1)),s("div",vt,[F(s("input",{type:"text","onUpdate:modelValue":e[14]||(e[14]=t=>u.value.name=t),class:"slm-input",placeholder:"ชื่อร้าน (เช่น มะนาวแซ่บ)"},null,512),[[Q,u.value.name]]),F(s("input",{type:"text","onUpdate:modelValue":e[15]||(e[15]=t=>u.value.phone=t),class:"slm-input",placeholder:"เบอร์โทรผู้ส่ง"},null,512),[[Q,u.value.phone]]),F(s("input",{type:"text","onUpdate:modelValue":e[16]||(e[16]=t=>u.value.address=t),class:"slm-input slm-col-span",placeholder:"ที่อยู่ผู้ส่ง (บ้านเลขที่ ตำบล อำเภอ จังหวัด รหัสไปรษณีย์)"},null,512),[[Q,u.value.address]]),F(s("input",{type:"text","onUpdate:modelValue":e[17]||(e[17]=t=>u.value.thankYouText=t),class:"slm-input slm-col-span",placeholder:"ข้อความขอบคุณท้ายใบปะหน้า (เช่น 🙏 ขอบคุณที่อุดหนุนนะคะ ❤️)"},null,512),[[Q,u.value.thankYouText]])])])):g("",!0),s("div",ft,[s("div",ht,[s("label",gt,[s("input",{type:"checkbox",checked:Be.value,onChange:e[18]||(e[18]=t=>Ie(t.target.checked))},null,40,yt),s("span",null,"เลือก "+r(f.value.length)+" จาก "+r(C.value.length)+" คน",1)]),y.value.length>0?(p(),m("span",bt,[s("span",kt,[e[34]||(e[34]=s("i",{class:"fa-solid fa-circle-check"},null,-1)),h(" มีที่อยู่ "+r(ve.value),1)]),fe.value>0?(p(),m("span",Ct,[e[35]||(e[35]=s("i",{class:"fa-solid fa-circle-exclamation"},null,-1)),h(" รอที่อยู่ "+r(fe.value),1)])):g("",!0)])):g("",!0)]),s("div",wt,[s("button",{class:"btn btn-primary slm-print-btn",onClick:De,disabled:y.value.length===0},[e[36]||(e[36]=s("i",{class:"fa-solid fa-print"},null,-1)),h(" สั่งพิมพ์ใบปะหน้า ("+r(y.value.length)+" ใบ) ",1)],8,_t)])])]),s("div",{class:b(["slm-preview-area",["paper-"+E.value,"mode-"+S.value]])},[y.value.length===0?(p(),m("div",$t,[...e[37]||(e[37]=[s("i",{class:"fa-solid fa-box-open slm-empty-icon"},null,-1),s("div",null,"ไม่มีรายการที่เลือกพิมพ์ (กรุณาคลิกเลือกรายชื่อลูกค้าด้านบน)",-1)])])):g("",!0),(p(!0),m(Z,null,Ae(y.value,t=>(p(),m("div",{key:t.id,class:b(["shipping-label-card",["label-"+E.value,S.value==="landscape"?"layout-landscape":"layout-portrait"]])},[W(t)>1?(p(),m("div",{key:0,class:"label-multi-addr-banner no-print",onClick:a=>T.value=t,title:"คลิกเพื่อสลับหรือเลือกที่อยู่จัดส่ง"},[s("div",At,[e[40]||(e[40]=s("i",{class:"fa-solid fa-layer-group"},null,-1)),s("span",null,[e[38]||(e[38]=h("มี ",-1)),s("b",null,r(W(t))+" ที่อยู่",1),e[39]||(e[39]=h(" • กำลังเลือกส่งที่: ",-1)),s("b",St,r(J(t)||"ที่อยู่นี้"),1)])]),s("button",{class:"banner-switch-btn",type:"button",onClick:A(a=>T.value=t,["stop"])},[...e[41]||(e[41]=[s("i",{class:"fa-solid fa-arrow-right-arrow-left"},null,-1),h(" สลับ/เลือกที่อยู่ ",-1)])],8,zt)],8,xt)):g("",!0),S.value==="landscape"?(p(),m("div",Bt,[s("div",It,[s("div",Lt,[s("div",Tt,r(u.value.name||"มะนาวแซ่บ"),1),s("div",Dt,r(u.value.address||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000"),1),s("div",Pt,"โทร. "+r(u.value.phone||"095-155-5706"),1)]),s("div",Nt,[s("div",{class:"ls-meta-text system-name",title:`ชื่อลูกค้าในระบบ: ${t.name}`},[s("span",null,r(ae(t)),1),s("span",{class:"ls-contact-tag",onClick:A(a=>ge(t),["stop"]),title:"คลิกเพื่อสลับช่องทางติดต่อ (Line / LineOA / โทร)"}," ("+r(de(t))+") ",9,Ot)],8,Et),s("div",{class:"ls-meta-text payment-text",onClick:A(a=>oe(t),["stop"]),title:"คลิกเพื่อสลับ โอน / COD"},r(K(t)),9,jt)])]),s("div",Ut,[s("div",qt,r(R(t)),1),s("div",Mt,r(le(t)||"⚠️ ยังไม่มีที่อยู่จัดส่ง (กรุณานำเข้าจาก Note หรือพิมพ์เพิ่ม)"),1),P(t)?(p(),m("div",Ft,[s("span",Vt,r(P(t)),1)])):g("",!0),s("div",Wt," โทร "+r(H(t)||"-"),1)])])):(p(),m("div",Yt,[s("div",Rt,[s("div",Ht,[s("div",Kt,r(u.value.name||"มะนาวแซ่บ"),1),s("div",Qt,r(u.value.address||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000"),1),s("div",Zt,"โทร. "+r(u.value.phone||"095-155-5706"),1)])]),s("div",Gt,[s("div",Jt,[s("div",Xt,r(R(t)),1),s("div",en,r(le(t)||"⚠️ ยังไม่มีที่อยู่จัดส่ง (กรุณานำเข้าจาก Note หรือพิมพ์เพิ่ม)"),1),P(t)?(p(),m("div",tn,[s("span",nn,r(P(t)),1)])):g("",!0),s("div",sn," โทร "+r(H(t)||"-"),1)])]),s("div",ln,[s("div",{class:"ls-meta-text system-name",title:`ชื่อลูกค้าในระบบ: ${t.name}`},[s("span",null,r(ae(t)),1),s("span",{class:"ls-contact-tag",onClick:A(a=>ge(t),["stop"]),title:"คลิกเพื่อสลับช่องทางติดต่อ (Line / LineOA / โทร)"}," ("+r(de(t))+") ",9,on)],8,an),s("div",{class:"ls-meta-text payment-text",onClick:A(a=>oe(t),["stop"]),title:"คลิกเพื่อสลับ โอน / COD"},r(K(t)),9,dn)])])),s("div",rn,r(u.value.thankYouText||"🙏 ขอบคุณที่อุดหนุนนะคะ ❤️"),1)],2))),128))],2)]),pe.value?(p(),Ee(Ue,{key:0,customer:pe.value,addressBook:ce.addressBook,onClose:e[19]||(e[19]=t=>T.value=null)},null,8,["customer","addressBook"])):g("",!0)]))}},yn=qe(cn,[["__scopeId","data-v-850f849c"]]);export{yn as default};
