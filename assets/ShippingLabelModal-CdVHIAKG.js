import{r as z,m as Ce,a as _e,k as w,o as Le,e as m,d as p,g as s,c as Pe,f as g,t as d,j as b,w as j,v as Y,h,F as W,i as we,l as x,B as Ne}from"./vendor-vue-CBCarKr4.js";import{u as ee,r as te}from"./vendor-firebase-rxR3kZVB.js";import{d as ne}from"./errorHandler-Bf2djCJr.js";import{n as q}from"./addressParser-CPG3fM4I.js";import Ee from"./CustomerAddressModal-BIMdhD9r.js";import{S as B}from"./vendor-sweetalert-DE6NlnlT.js";import{_ as Oe}from"./_plugin-vue_export-helper-DlAUqK2U.js";const je={class:"slm-modal"},qe={class:"slm-header no-print"},Me={class:"slm-title"},Ue={class:"slm-count-badge"},Fe={class:"slm-controls no-print"},Ve={class:"slm-filter-group"},Re={class:"slm-customer-selector"},Ye={class:"slm-selector-header"},We={class:"slm-search-box"},He={class:"slm-quick-select-btns"},Ke={class:"slm-chips-scroll"},Qe=["onClick","title"],Ze={class:"chip-checkbox"},Ge={class:"chip-name"},Je={key:0,class:"chip-items"},Xe=["onClick","title"],et={key:0,class:"chip-active-lbl"},tt=["onClick","title"],nt=["onClick","title"],st={key:2,class:"chip-warn-tag",title:"ยังไม่มีที่อยู่"},it={key:0,class:"slm-no-chips"},lt={class:"slm-options-row"},at={class:"slm-select-wrap"},ot={class:"slm-orient-tabs"},dt={class:"slm-select-wrap"},rt={style:{display:"flex",gap:"8px","flex-wrap":"wrap"}},ct={key:0,class:"slm-sender-box"},pt={class:"slm-sender-grid"},ut={class:"slm-select-bar"},mt={style:{display:"flex","align-items":"center",gap:"12px","flex-wrap":"wrap"}},vt={class:"slm-check-all"},ft=["checked"],ht={key:0,class:"slm-addr-counter"},gt={class:"cnt-item has"},yt={key:0,class:"cnt-item missing"},bt={style:{display:"flex",gap:"8px"}},kt=["disabled"],Ct={key:0,class:"slm-empty-state no-print"},_t=["onClick"],wt={class:"banner-text"},$t={class:"highlight-label"},xt=["onClick"],At={key:1,class:"label-main-grid"},St={class:"ls-sender-col"},zt={class:"ls-sender-info"},Bt={class:"ls-sender-name"},It={class:"ls-sender-addr",style:{"white-space":"pre-line"}},Tt={class:"ls-sender-phone"},Dt={class:"ls-bottom-left"},Lt=["title"],Pt=["onClick"],Nt=["onClick"],Et={class:"ls-receiver-col"},Ot={class:"ls-receiver-name"},jt={class:"ls-receiver-addr"},qt={key:0,class:"ls-receiver-zip"},Mt={class:"zip-big"},Ut={class:"ls-receiver-phone"},Ft={key:2,class:"label-portrait-body"},Vt={class:"label-sender-block"},Rt={class:"sender-body"},Yt={class:"sender-name-line"},Wt={class:"sender-addr-line",style:{"white-space":"pre-line"}},Ht={class:"sender-phone-line"},Kt={class:"label-receiver-block"},Qt={class:"receiver-body"},Zt={class:"receiver-name"},Gt={class:"receiver-address"},Jt={key:0,class:"receiver-zipcode"},Xt={class:"zip-num"},en={class:"receiver-phone"},tn={class:"portrait-meta-bottom"},nn=["title"],sn=["onClick"],ln=["onClick"],an={class:"label-thankyou-footer"},on={__name:"ShippingLabelModal",props:{customers:{type:Array,default:()=>[]},addressBook:{type:Object,default:()=>({})},initialSelectedId:{type:String,default:null}},emits:["close"],setup(de){let I=null;const c=de,k=z("unprinted"),A=z("landscape"),H=z("thermal-76x130"),K=z(!1),v=z([]),S=z(""),T=z(null),re=w(()=>T.value?c.customers.find(n=>n.id===T.value.id)||T.value:null),u=z({name:localStorage.getItem("manowzab_sender_name")||"มะนาวแซ่บ",phone:localStorage.getItem("manowzab_sender_phone")||"095-155-5706",address:localStorage.getItem("manowzab_sender_address")||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000",thankYouText:localStorage.getItem("manowzab_sender_thankyou")||"🙏 ขอบคุณที่อุดหนุนนะคะ ❤️"});Ce(u,n=>{localStorage.setItem("manowzab_sender_name",n.name||""),localStorage.setItem("manowzab_sender_phone",n.phone||""),localStorage.setItem("manowzab_sender_address",n.address||""),localStorage.setItem("manowzab_sender_thankyou",n.thankYouText||"")},{deep:!0});function N(n){if(!n)return 1/0;const e=new Date;e.setHours(0,0,0,0);const t=new Date(n);return t.setHours(0,0,0,0),Math.ceil((t-e)/(1e3*60*60*24))}const $=w(()=>[...c.customers.filter(e=>c.initialSelectedId&&e.id===c.initialSelectedId?!0:e&&e.status!=="done"&&e.deliveryDate&&typeof e.deliveryDate=="string"&&e.deliveryDate.trim()!=="")].sort((e,t)=>{const a=N(e.deliveryDate),l=N(t.deliveryDate);return a!==l?a-l:(e.deliveryDate||"").localeCompare(t.deliveryDate||"")})),$e=w(()=>$.value.filter(n=>!n.labelPrinted).length),ce=w(()=>$.value.filter(n=>N(n.deliveryDate)===0).length),pe=w(()=>$.value.filter(n=>N(n.deliveryDate)===1).length),xe=w(()=>$.value.length),C=w(()=>{let n=$.value;if(k.value==="unprinted"?n=$.value.filter(e=>!e.labelPrinted):k.value==="today"?n=$.value.filter(e=>N(e.deliveryDate)===0):k.value==="pack-tonight"&&(n=$.value.filter(e=>N(e.deliveryDate)===1)),c.initialSelectedId){const e=$.value.find(t=>t.id===c.initialSelectedId);e&&!n.some(t=>t.id===c.initialSelectedId)&&(n=[e,...n])}if(S.value.trim()){const e=S.value.trim().toLowerCase();n=n.filter(t=>{const a=(t.name||"").toLowerCase(),l=(t.recipientName||"").toLowerCase(),i=(O(t)||"").toLowerCase();return a.includes(e)||l.includes(e)||i.includes(e)})}return n}),y=w(()=>C.value.filter(n=>v.value.includes(n.id))),ue=w(()=>y.value.filter(n=>!!O(n)).length),me=w(()=>y.value.length-ue.value),Ae=w(()=>C.value.length>0&&v.value.length===C.value.length);Ce(()=>c.initialSelectedId,n=>{n?(k.value="all-requested",v.value=[n],S.value=""):(k.value="all-requested",v.value=C.value.map(e=>e.id))},{immediate:!0}),_e(()=>{c.initialSelectedId?(k.value="all-requested",v.value=[c.initialSelectedId],S.value=""):(k.value="all-requested",v.value=C.value.map(n=>n.id))});function D(n){k.value=n,v.value=C.value.map(e=>e.id)}function Se(n){n?v.value=C.value.map(e=>e.id):v.value=[]}function ze(n){const e=v.value.indexOf(n);e>-1?v.value.splice(e,1):v.value.push(n)}async function Be(n){const e=!n.labelPrinted;try{await ee(te(ne,`delivery_customers/${n.id}`),{labelPrinted:e,labelPrintedAt:e?Date.now():null}),B.fire({icon:"success",title:e?`ทำเครื่องหมาย "${n.name}" พิมพ์แล้ว`:`ยกเลิกสถานะพิมพ์แล้วของ "${n.name}"`,toast:!0,position:"top-end",timer:1500,showConfirmButton:!1})}catch(t){console.error("Error updating printed status:",t)}}function E(n){if(!n)return[];const e=q(n.name).replace(/[.#$[\]/]/g,"_"),t=n.addresses,a=c.addressBook&&c.addressBook[e]?.addresses,l=t||a;let i=[];if(Array.isArray(l)?i=l.filter(Boolean):l&&typeof l=="object"&&(i=Object.values(l).filter(Boolean)),i.length>0)return i;if(n.address&&n.address.trim()){const r=U(n);return r&&r.address?[r]:[]}return[]}function M(n){return E(n).length}function Q(n){if(!n)return"";const e=E(n);if(!e||e.length===0)return"";if(n.selectedAddressId){const t=e.find(a=>a.id===n.selectedAddressId);if(t)return t.label||(t.recipientName?`${t.recipientName}`:"")}if(n.address&&n.address.trim()){const t=n.address.trim(),a=e.find(l=>l.address&&l.address.trim()===t);if(a)return a.label||(a.recipientName?`${a.recipientName}`:"")}return e[0]?.label||""}function U(n){if(n.address)return{recipientName:n.recipientName||"",phone:n.phone||"",address:n.address||"",postalCode:n.postalCode||""};const e=q(n.name).replace(/[.#$[\]/]/g,"_");return c.addressBook&&c.addressBook[e]?c.addressBook[e]:{recipientName:"",phone:"",address:"",postalCode:""}}function Z(n){if(n.recipientName&&n.recipientName.trim())return n.recipientName.trim();const e=U(n);return e&&e.recipientName&&e.recipientName.trim()?e.recipientName.trim():n.name}function G(n){return U(n).phone}function O(n){return U(n).address}function L(n){const e=U(n);if(e.postalCode)return e.postalCode;const t=(e.address||"").match(/\b[1-9]\d{4}\b(?!\/|\d)/);return t?t[0]:""}function se(n){const e=O(n)||"",t=L(n);return t?e.replace(new RegExp(`\\b${t}\\b(?![/\\d])`,"g"),"").replace(/\s+/g," ").trim():e}function ie(n,e=15){const t=(n?.name||"-").trim();return t.length<=e?t:t.slice(0,e).trim()+"…"}function P(n){if(!n)return"";if(n.paymentType){const o=String(n.paymentType).trim().toLowerCase();if(o==="cod"||o==="ปลายทาง"||o==="เก็บเงินปลายทาง"||o==="เก็บปลายทาง")return"cod";if(o==="transfer"||o==="โอน"||o==="โอนเงิน")return"transfer"}const e=q(n.name).replace(/[.#$[\]/]/g,"_"),t=c.addressBook&&e?c.addressBook[e]:null;if(t&&t.paymentType){const o=String(t.paymentType).trim().toLowerCase();if(o==="cod"||o==="ปลายทาง"||o==="เก็บเงินปลายทาง"||o==="เก็บปลายทาง")return"cod";if(o==="transfer"||o==="โอน"||o==="โอนเงิน")return"transfer"}const a=E(n),l=n.selectedAddressId?a.find(o=>o.id===n.selectedAddressId):a[0];if(l&&l.paymentType){const o=String(l.paymentType).trim().toLowerCase();if(o==="cod"||o==="ปลายทาง"||o==="เก็บเงินปลายทาง"||o==="เก็บปลายทาง")return"cod";if(o==="transfer"||o==="โอน"||o==="โอนเงิน")return"transfer"}const i=(n.note||"").toLowerCase(),r=(n.address||"").toLowerCase();return i.includes("cod")||i.includes("ปลายทาง")||i.includes("เก็บเงิน")||r.includes("cod")||r.includes("ปลายทาง")?"cod":""}function Ie(n){return P(n)==="cod"}function F(n){const e=P(n);if(e==="cod"){const t=(n?.note||"").match(/(?:cod|ปลายทาง)\s*[:=]?\s*(\d+)/i);return t&&t[1]?`COD (${t[1]}฿)`:"COD"}return e==="transfer"?"โอน":"ยังไม่ระบุ"}async function le(n){if(!n)return;const e=P(n),t=e==="cod"?"transfer":e==="transfer"?"cod":"transfer";n.paymentType=t;const a=Date.now(),l=q(n.name).replace(/[.#$[\]/]/g,"_"),i={[`delivery_customers/${n.id}/paymentType`]:t,[`delivery_customers/${n.id}/updatedAt`]:a};l&&(i[`address_book/${l}/paymentType`]=t,i[`address_book/${l}/name`]=n.name.trim(),i[`address_book/${l}/updatedAt`]=a,c.addressBook&&c.addressBook[l]&&(c.addressBook[l].paymentType=t));const r=E(n);if(r.length>0){const o=r.map(_=>({..._,paymentType:n.selectedAddressId&&_.id===n.selectedAddressId||r.length===1?t:_.paymentType||t}));i[`delivery_customers/${n.id}/addresses`]=o,l&&(i[`address_book/${l}/addresses`]=o)}try{await ee(te(ne),i),B.fire({icon:"success",title:`บันทึกรูปแบบ "${n.name}" เป็น "${t==="cod"?"COD":"โอน"}" ไว้ในประวัติลูกค้าแล้ว`,toast:!0,position:"top-end",timer:1500,showConfirmButton:!1})}catch(o){console.error("Error toggling paymentType:",o)}}function ve(n){if(!n)return"";if(n.contactChannel){const i=String(n.contactChannel).trim().toLowerCase();if(i==="lineoa"||i==="line_oa"||i==="line-oa")return"lineoa";if(i==="phone"||i==="tel"||i==="โทร"||i==="โทรศัพท์")return"phone";if(i==="line")return"line"}const e=q(n.name).replace(/[.#$[\]/]/g,"_"),t=c.addressBook&&e?c.addressBook[e]:null;if(t&&t.contactChannel){const i=String(t.contactChannel).trim().toLowerCase();if(i==="lineoa"||i==="line_oa"||i==="line-oa")return"lineoa";if(i==="phone"||i==="tel"||i==="โทร"||i==="โทรศัพท์")return"phone";if(i==="line")return"line"}const a=E(n),l=n.selectedAddressId?a.find(i=>i.id===n.selectedAddressId):a[0];if(l&&l.contactChannel){const i=String(l.contactChannel).trim().toLowerCase();if(i==="lineoa"||i==="line_oa"||i==="line-oa")return"lineoa";if(i==="phone"||i==="tel"||i==="โทร"||i==="โทรศัพท์")return"phone";if(i==="line")return"line"}return""}function ae(n){const e=ve(n);return e==="lineoa"?"LineOA":e==="phone"?"โทร":e==="line"?"Line":"-"}async function fe(n){if(!n)return;const e=ve(n),t=e==="line"?"lineoa":e==="lineoa"?"phone":"line";n.contactChannel=t;const a=Date.now(),l=q(n.name).replace(/[.#$[\]/]/g,"_"),i={[`delivery_customers/${n.id}/contactChannel`]:t,[`delivery_customers/${n.id}/updatedAt`]:a};l&&(i[`address_book/${l}/contactChannel`]=t,i[`address_book/${l}/name`]=n.name.trim(),i[`address_book/${l}/updatedAt`]=a,c.addressBook&&c.addressBook[l]&&(c.addressBook[l].contactChannel=t));const r=E(n);if(r.length>0){const o=r.map(_=>({..._,contactChannel:n.selectedAddressId&&_.id===n.selectedAddressId||r.length===1?t:_.contactChannel||t}));i[`delivery_customers/${n.id}/addresses`]=o,l&&(i[`address_book/${l}/addresses`]=o)}try{await ee(te(ne),i);const o=t==="lineoa"?"LineOA":t==="phone"?"โทรศัพท์":"Line";B.fire({icon:"success",title:`บันทึกช่องทางติดต่อ "${n.name}" เป็น "${o}" เรียบร้อย`,toast:!0,position:"top-end",timer:1500,showConfirmButton:!1})}catch(o){console.error("Error toggling contactChannel:",o)}}function Te(){if(y.value.length===0)return;const n=document.getElementById("manowzab-label-print-frame");n&&n.remove();const e=document.createElement("iframe");e.id="manowzab-label-print-frame",e.style.position="fixed",e.style.right="0",e.style.bottom="0",e.style.width="0",e.style.height="0",e.style.border="0",e.style.zIndex="-9999",document.body.appendChild(e);const t=A.value==="landscape",a=t?"130mm":"76mm",l=t?"76mm":"130mm",i=u.value.name||"มะนาวแซ่บ",r=u.value.phone||"095-155-5706",o=(u.value.address||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000").replace(/\n/g,"<br>"),_=u.value.thankYouText||"🙏 ขอบคุณที่อุดหนุนนะคะ ❤️",oe=y.value.map((f,J)=>{const R=Z(f),he=se(f)||"⚠️ ยังไม่มีที่อยู่จัดส่ง",X=L(f),ge=G(f)||"-";Ie(f);const ye=F(f),be=ie(f),ke=ae(f);return t?`
          <div class="print-page">
            <div class="print-card landscape">
              <div class="card-grid">
                <!-- Left: Sender + Bottom-Left System Info -->
                <div class="ls-sender">
                  <div class="sender-top-info">
                    <div class="sender-name">${i}</div>
                    <div class="sender-addr">${o}</div>
                    <div class="sender-phone">โทร. ${r}</div>
                  </div>

                  <!-- 📌 Bottom-Left Meta on Printed Label (Plain Text) -->
                  <div class="ls-meta-bottom">
                    <div class="meta-system-name">${be} (${ke})</div>
                    <div class="meta-payment-row">${ye}</div>
                  </div>
                </div>

                <!-- Right: Receiver -->
                <div class="ls-receiver">
                  <div class="receiver-name">${R}</div>
                  <div class="receiver-addr">${he}</div>
                  ${X?`<div class="receiver-zip">${X}</div>`:""}
                  <div class="receiver-phone">โทร ${ge}</div>
                </div>
              </div>

              <!-- Thank you footer -->
              <div class="card-footer">${_}</div>
            </div>
          </div>
        `:`
          <div class="print-page">
            <div class="print-card portrait">
              <div class="port-sender">
                <div class="sender-name">${i}</div>
                <div class="sender-addr">${o}</div>
                <div class="sender-phone">โทร. ${r}</div>
              </div>

              <div class="port-receiver">
                <div class="receiver-name">${R}</div>
                <div class="receiver-addr">${he}</div>
                ${X?`<div class="receiver-zip">${X}</div>`:""}
                <div class="receiver-phone">โทร ${ge}</div>
              </div>

              <!-- Portrait Bottom-Left Meta (Plain Text) -->
              <div class="port-meta-bottom">
                <div class="meta-system-name">${be} (${ke})</div>
                <div class="meta-payment-row">${ye}</div>
              </div>

              <div class="card-footer">${_}</div>
            </div>
          </div>
        `}).join(""),V=e.contentWindow.document;V.open(),V.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>พิมพ์ใบปะหน้าพัสดุ - ${i}</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: ${a} ${l} ${t?"landscape":"portrait"};
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: 'Sarabun', 'TH Sarabun New', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-page {
            width: ${a};
            height: ${l};
            max-width: ${a};
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
            padding: 4mm 6mm 1mm 6mm;
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
            gap: 6mm;
            flex: 1;
          }
          .ls-sender {
            width: 32%;
            font-size: 8.5pt;
            line-height: 1.4;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding-top: 1mm;
            padding-bottom: 1.5mm;
          }
          .sender-top-info {
            display: flex;
            flex-direction: column;
          }
          .sender-name {
            font-size: 10.5pt;
            font-weight: 600;
            margin-bottom: 2px;
          }
          .sender-addr {
            font-size: 8.5pt;
            font-weight: 400;
            margin-top: 2px;
            line-height: 1.4;
          }
          .sender-phone {
            font-size: 8.5pt;
            font-weight: 500;
            margin-top: 3px;
          }
          .ls-meta-bottom {
            margin-top: auto;
            padding-top: 1.5mm;
            display: flex;
            flex-direction: column;
            gap: 0.5mm;
            font-size: 9pt;
            line-height: 1.3;
          }
          .meta-system-name {
            font-size: 9pt;
            color: #000000;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 36mm;
          }
          .meta-payment-row {
            font-size: 9pt;
            color: #000000;
            font-weight: 500;
          }
          .ls-receiver {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            padding-bottom: 7.5mm;
            padding-top: 0;
            padding-left: 0;
            word-break: break-word;
            overflow-wrap: break-word;
          }
          .port-sender {
            font-size: 8.5pt;
            line-height: 1.4;
          }
          .port-receiver {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            padding-bottom: 10mm;
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
            font-size: 9pt;
            line-height: 1.3;
          }
          .port-meta-bottom .meta-system-name {
            max-width: 60mm;
          }
          .receiver-name {
            font-size: 13.5pt;
            font-weight: 600;
            line-height: 1.3;
            margin-bottom: 3px;
          }
          .receiver-addr {
            font-size: 11pt;
            line-height: 1.45;
            font-weight: 400;
          }
          .receiver-zip {
            margin-top: 3px;
            font-size: 14pt;
            font-weight: 600;
            letter-spacing: 1.5px;
          }
          .receiver-phone {
            font-size: 11pt;
            font-weight: 500;
            margin-top: 3px;
          }
          .card-footer {
            text-align: center;
            font-size: 9pt;
            font-weight: 400;
            margin-top: auto;
            padding-top: 0;
            padding-bottom: 0.5mm;
          }
        </style>
      </head>
      <body>
        ${oe}
      </body>
    </html>
  `),V.close(),I&&clearTimeout(I),I=setTimeout(async()=>{try{e.contentWindow&&e.contentWindow.document.fonts&&await e.contentWindow.document.fonts.ready}catch{}e.contentWindow.focus(),e.contentWindow.print();try{const f={},J=Date.now();y.value.forEach(R=>{f[`delivery_customers/${R.id}/labelPrinted`]=!0,f[`delivery_customers/${R.id}/labelPrintedAt`]=J}),Object.keys(f).length>0&&await ee(te(ne),f)}catch(f){console.error("Error auto-updating labelPrinted status:",f)}I=null},250)}Le(()=>{I&&(clearTimeout(I),I=null);const n=document.getElementById("manowzab-label-print-frame");n&&n.remove(),typeof B<"u"&&B.isVisible()&&B.close()});function De(){if(y.value.length===0){B.fire({icon:"warning",title:"ไม่มีรายการที่เลือก",text:"กรุณาเลือกรายการลูกค้าที่ต้องการส่งออกก่อนครับ"});return}const n=[["ลำดับ","ชื่อผู้รับ (พิมพ์บนกล่อง)","ชื่อในระบบ (CF)","รูปแบบการส่ง","เบอร์โทร","ที่อยู่","รหัสไปรษณีย์","จำนวนสินค้า","รอบส่ง","โน้ต","ผู้ส่ง","เบอร์ผู้ส่ง","ที่อยู่ผู้ส่ง"]];y.value.forEach((r,o)=>{const _=Z(r)||"",oe=G(r)||"",V=O(r)||"",f=L(r)||"",J=F(r);n.push([o+1,`"${_.replace(/"/g,'""')}"`,`"${(r.name||"").replace(/"/g,'""')}"`,`"${J}"`,`"${oe}"`,`"${V.replace(/"/g,'""')}"`,`"${f}"`,r.itemCount||0,r.deliveryDate||"",`"${(r.note||"").replace(/"/g,'""')}"`,`"${(u.value.name||"").replace(/"/g,'""')}"`,`"${(u.value.phone||"").replace(/"/g,'""')}"`,`"${(u.value.address||"").replace(/"/g,'""')}"`])});const e="\uFEFF"+n.map(r=>r.join(",")).join(`
`),t=new Blob([e],{type:"text/csv;charset=utf-8;"}),a=URL.createObjectURL(t),l=document.createElement("a"),i=new Date().toISOString().split("T")[0];l.setAttribute("href",a),l.setAttribute("download",`รายการที่อยู่จัดส่ง_130x76_${i}.csv`),document.body.appendChild(l),l.click(),document.body.removeChild(l),B.fire({icon:"success",title:"ส่งออกไฟล์สำเร็จ!",html:`
      <div style="text-align: left; font-size: 0.9em; line-height: 1.6;">
        ดาวน์โหลดไฟล์ <b>.csv</b> เรียบร้อยแล้ว<br>
        สามารถนำไฟล์นี้ไปกดเปิดในแอปเครื่องพิมพ์ (ปุ่ม <b>Excel</b>) เพื่อพิมพ์สติ๊กเกอร์รวดเดียวได้เลยครับ!
      </div>
    `,confirmButtonColor:"#3b82f6"})}return _e(()=>{ce.value>0?D("today"):pe.value>0?D("pack-tonight"):D("all-requested")}),(n,e)=>(p(),m("div",{class:"slm-overlay",onClick:e[20]||(e[20]=x(t=>n.$emit("close"),["self"]))},[s("div",je,[s("div",qe,[s("div",Me,[e[21]||(e[21]=s("span",null,"🏷️ ใบปะหน้าพัสดุ 130x76 mm (แนวนอน)",-1)),s("span",Ue,d(y.value.length)+" รายการ",1)]),s("button",{class:"slm-close-btn",onClick:e[0]||(e[0]=t=>n.$emit("close")),title:"ปิด"},[...e[22]||(e[22]=[s("i",{class:"fa-solid fa-xmark"},null,-1)])])]),s("div",Fe,[s("div",Ve,[s("button",{class:b(["slm-filter-btn",{active:k.value==="unprinted"}]),onClick:e[1]||(e[1]=t=>D("unprinted"))}," ⏳ ยังไม่พิมพ์ ("+d($e.value)+") ",3),s("button",{class:b(["slm-filter-btn",{active:k.value==="today"}]),onClick:e[2]||(e[2]=t=>D("today"))}," 🚨 ส่งวันนี้ ("+d(ce.value)+") ",3),s("button",{class:b(["slm-filter-btn",{active:k.value==="pack-tonight"}]),onClick:e[3]||(e[3]=t=>D("pack-tonight"))}," 📦 แพ็คคืนนี้ ("+d(pe.value)+") ",3),s("button",{class:b(["slm-filter-btn",{active:k.value==="all-requested"}]),onClick:e[4]||(e[4]=t=>D("all-requested"))}," 🌐 ทั้งหมดที่รอส่ง ("+d(xe.value)+") ",3)]),s("div",Re,[s("div",Ye,[s("div",We,[e[23]||(e[23]=s("i",{class:"fa-solid fa-magnifying-glass slm-search-icon"},null,-1)),j(s("input",{type:"text","onUpdate:modelValue":e[5]||(e[5]=t=>S.value=t),class:"slm-search-input",placeholder:"🔍 ค้นหาชื่อลูกค้า / ผู้รับ (เช่น หนิง, ปิยะวาท)..."},null,512),[[Y,S.value]]),S.value?(p(),m("button",{key:0,class:"slm-clear-search",onClick:e[6]||(e[6]=t=>S.value="")},"✕")):g("",!0)]),s("div",He,[s("button",{class:"slm-mini-btn",onClick:e[7]||(e[7]=t=>v.value=C.value.map(a=>a.id))},[...e[24]||(e[24]=[s("i",{class:"fa-solid fa-check-double"},null,-1),h(" เลือกทั้งหมด ",-1)])]),s("button",{class:"slm-mini-btn",onClick:e[8]||(e[8]=t=>v.value=[])},[...e[25]||(e[25]=[s("i",{class:"fa-solid fa-xmark"},null,-1),h(" ยกเลิกทั้งหมด ",-1)])]),s("button",{class:"slm-mini-btn highlight",onClick:e[9]||(e[9]=t=>v.value=C.value.filter(a=>!a.labelPrinted).map(a=>a.id))},[...e[26]||(e[26]=[s("i",{class:"fa-solid fa-filter"},null,-1),h(" เฉพาะที่ยังไม่พิมพ์ ",-1)])])])]),s("div",Ke,[(p(!0),m(W,null,we(C.value,t=>(p(),m("div",{key:t.id,class:b(["slm-cust-chip",{selected:v.value.includes(t.id),printed:t.labelPrinted,"no-address":!O(t)}]),onClick:a=>ze(t.id),title:`คลิกเพื่อ ${v.value.includes(t.id)?"ยกเลิก":"เลือก"} ${t.name}`},[s("span",Ze,[s("i",{class:b(["fa-solid",v.value.includes(t.id)?"fa-square-check":"fa-square"])},null,2)]),s("span",Ge,d(t.name),1),t.itemCount?(p(),m("span",Je,"("+d(t.itemCount)+" ชิ้น)",1)):g("",!0),M(t)>1?(p(),m("span",{key:1,class:"chip-multi-addr-tag",onClick:x(a=>T.value=t,["stop"]),title:`ลูกค้ารายนี้มี ${M(t)} ที่อยู่ (เลือก: ${Q(t)||"ที่อยู่นี้"}) — คลิกเพื่อเปลี่ยนที่อยู่จัดส่ง`},[e[27]||(e[27]=s("i",{class:"fa-solid fa-layer-group"},null,-1)),s("span",null,d(M(t))+" ที่อยู่",1),Q(t)?(p(),m("span",et,": "+d(Q(t)),1)):g("",!0)],8,Xe)):g("",!0),s("span",{class:b(["chip-payment-tag",P(t)==="cod"?"is-cod":P(t)==="transfer"?"is-transfer":"is-unspecified"]),onClick:x(a=>le(t),["stop"]),title:`รูปแบบจัดส่ง: ${F(t)} (คลิกเพื่อสลับระหว่าง โอน / COD)`},[P(t)==="cod"?(p(),m(W,{key:0},[h("💵 COD")],64)):P(t)==="transfer"?(p(),m(W,{key:1},[h("💳 โอน")],64)):(p(),m(W,{key:2},[h("❓ ยังไม่ระบุ")],64))],10,tt),s("span",{class:b(["chip-status-tag",t.labelPrinted?"is-printed":"is-unprinted"]),onClick:x(a=>Be(t),["stop"]),title:t.labelPrinted?"พิมพ์แล้ว (คลิกเพื่อเปลี่ยนเป็นยังไม่พิมพ์)":"ยังไม่พิมพ์ (คลิกเพื่อเปลี่ยนเป็นพิมพ์แล้ว)"},[s("i",{class:b(t.labelPrinted?"fa-solid fa-circle-check":"fa-solid fa-print")},null,2),h(" "+d(t.labelPrinted?"พิมพ์แล้ว":"ยังไม่พิมพ์"),1)],10,nt),O(t)?g("",!0):(p(),m("span",st," ⚠️ รอที่อยู่ "))],10,Qe))),128)),C.value.length===0?(p(),m("div",it," ไม่พบรายชื่อในหมวดนี้ ")):g("",!0)])]),s("div",lt,[s("div",at,[e[28]||(e[28]=s("label",null,[s("i",{class:"fa-solid fa-rotate"}),h(" ทิศทาง:")],-1)),s("div",ot,[s("button",{class:b(["slm-orient-btn",{active:A.value==="landscape"}]),onClick:e[10]||(e[10]=t=>A.value="landscape")}," 🔄 แนวนอน (130x76mm) ",2),s("button",{class:b(["slm-orient-btn",{active:A.value==="portrait"}]),onClick:e[11]||(e[11]=t=>A.value="portrait")}," ↕️ แนวตั้ง (76x130mm) ",2)])]),s("div",dt,[e[30]||(e[30]=s("label",null,[s("i",{class:"fa-solid fa-scroll"}),h(" ขนาดฉลาก:")],-1)),j(s("select",{"onUpdate:modelValue":e[12]||(e[12]=t=>H.value=t),class:"slm-select"},[...e[29]||(e[29]=[s("option",{value:"thermal-76x130"},"สติ๊กเกอร์ 76 x 130 mm (มาตรฐานของคุณ)",-1),s("option",{value:"thermal-100x150"},'สติ๊กเกอร์ 100 x 150 mm (4x6")',-1),s("option",{value:"thermal-80x100"},"สติ๊กเกอร์ 80 x 100 mm",-1),s("option",{value:"a4-grid"},"กระดาษ A4 (สติ๊กเกอร์ 2 คอลัมน์)",-1)])],512),[[Ne,H.value]])]),s("div",rt,[s("button",{class:"slm-export-excel-btn",onClick:De,title:"ส่งออกไฟล์เพื่อนำเข้าไปเปิดในแอปเครื่องพิมพ์"},[...e[31]||(e[31]=[s("i",{class:"fa-solid fa-file-excel"},null,-1),h(" ส่งออก Excel เข้าแอปปริ้นเตอร์ ",-1)])]),s("button",{class:"slm-toggle-sender-btn",onClick:e[13]||(e[13]=t=>K.value=!K.value)},[e[32]||(e[32]=s("i",{class:"fa-solid fa-store"},null,-1)),h(" "+d(K.value?"ซ่อนข้อมูลร้าน":"แก้ไขข้อมูลร้านผู้ส่ง"),1)])])]),K.value?(p(),m("div",ct,[e[33]||(e[33]=s("div",{class:"slm-sender-title"},"🏠 ข้อมูลผู้ส่งและข้อความขอบคุณ (บันทึกจำไว้ในเครื่องอัตโนมัติ)",-1)),s("div",pt,[j(s("input",{type:"text","onUpdate:modelValue":e[14]||(e[14]=t=>u.value.name=t),class:"slm-input",placeholder:"ชื่อร้าน (เช่น มะนาวแซ่บ)"},null,512),[[Y,u.value.name]]),j(s("input",{type:"text","onUpdate:modelValue":e[15]||(e[15]=t=>u.value.phone=t),class:"slm-input",placeholder:"เบอร์โทรผู้ส่ง"},null,512),[[Y,u.value.phone]]),j(s("input",{type:"text","onUpdate:modelValue":e[16]||(e[16]=t=>u.value.address=t),class:"slm-input slm-col-span",placeholder:"ที่อยู่ผู้ส่ง (บ้านเลขที่ ตำบล อำเภอ จังหวัด รหัสไปรษณีย์)"},null,512),[[Y,u.value.address]]),j(s("input",{type:"text","onUpdate:modelValue":e[17]||(e[17]=t=>u.value.thankYouText=t),class:"slm-input slm-col-span",placeholder:"ข้อความขอบคุณท้ายใบปะหน้า (เช่น 🙏 ขอบคุณที่อุดหนุนนะคะ ❤️)"},null,512),[[Y,u.value.thankYouText]])])])):g("",!0),s("div",ut,[s("div",mt,[s("label",vt,[s("input",{type:"checkbox",checked:Ae.value,onChange:e[18]||(e[18]=t=>Se(t.target.checked))},null,40,ft),s("span",null,"เลือก "+d(v.value.length)+" จาก "+d(C.value.length)+" คน",1)]),y.value.length>0?(p(),m("span",ht,[s("span",gt,[e[34]||(e[34]=s("i",{class:"fa-solid fa-circle-check"},null,-1)),h(" มีที่อยู่ "+d(ue.value),1)]),me.value>0?(p(),m("span",yt,[e[35]||(e[35]=s("i",{class:"fa-solid fa-circle-exclamation"},null,-1)),h(" รอที่อยู่ "+d(me.value),1)])):g("",!0)])):g("",!0)]),s("div",bt,[s("button",{class:"btn btn-primary slm-print-btn",onClick:Te,disabled:y.value.length===0},[e[36]||(e[36]=s("i",{class:"fa-solid fa-print"},null,-1)),h(" สั่งพิมพ์ใบปะหน้า ("+d(y.value.length)+" ใบ) ",1)],8,kt)])])]),s("div",{class:b(["slm-preview-area",["paper-"+H.value,"mode-"+A.value]])},[y.value.length===0?(p(),m("div",Ct,[...e[37]||(e[37]=[s("i",{class:"fa-solid fa-box-open slm-empty-icon"},null,-1),s("div",null,"ไม่มีรายการที่เลือกพิมพ์ (กรุณาคลิกเลือกรายชื่อลูกค้าด้านบน)",-1)])])):g("",!0),(p(!0),m(W,null,we(y.value,t=>(p(),m("div",{key:t.id,class:b(["shipping-label-card",["label-"+H.value,A.value==="landscape"?"layout-landscape":"layout-portrait"]])},[M(t)>1?(p(),m("div",{key:0,class:"label-multi-addr-banner no-print",onClick:a=>T.value=t,title:"คลิกเพื่อสลับหรือเลือกที่อยู่จัดส่ง"},[s("div",wt,[e[40]||(e[40]=s("i",{class:"fa-solid fa-layer-group"},null,-1)),s("span",null,[e[38]||(e[38]=h("มี ",-1)),s("b",null,d(M(t))+" ที่อยู่",1),e[39]||(e[39]=h(" • กำลังเลือกส่งที่: ",-1)),s("b",$t,d(Q(t)||"ที่อยู่นี้"),1)])]),s("button",{class:"banner-switch-btn",type:"button",onClick:x(a=>T.value=t,["stop"])},[...e[41]||(e[41]=[s("i",{class:"fa-solid fa-arrow-right-arrow-left"},null,-1),h(" สลับ/เลือกที่อยู่ ",-1)])],8,xt)],8,_t)):g("",!0),A.value==="landscape"?(p(),m("div",At,[s("div",St,[s("div",zt,[s("div",Bt,d(u.value.name||"มะนาวแซ่บ"),1),s("div",It,d(u.value.address||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000"),1),s("div",Tt,"โทร. "+d(u.value.phone||"095-155-5706"),1)]),s("div",Dt,[s("div",{class:"ls-meta-text system-name",title:`ชื่อลูกค้าในระบบ: ${t.name}`},[s("span",null,d(ie(t)),1),s("span",{class:"ls-contact-tag",onClick:x(a=>fe(t),["stop"]),title:"คลิกเพื่อสลับช่องทางติดต่อ (Line / LineOA / โทร)"}," ("+d(ae(t))+") ",9,Pt)],8,Lt),s("div",{class:"ls-meta-text payment-text",onClick:x(a=>le(t),["stop"]),title:"คลิกเพื่อสลับ โอน / COD"},d(F(t)),9,Nt)])]),s("div",Et,[s("div",Ot,d(Z(t)),1),s("div",jt,d(se(t)||"⚠️ ยังไม่มีที่อยู่จัดส่ง (กรุณานำเข้าจาก Note หรือพิมพ์เพิ่ม)"),1),L(t)?(p(),m("div",qt,[s("span",Mt,d(L(t)),1)])):g("",!0),s("div",Ut," โทร "+d(G(t)||"-"),1)])])):(p(),m("div",Ft,[s("div",Vt,[s("div",Rt,[s("div",Yt,d(u.value.name||"มะนาวแซ่บ"),1),s("div",Wt,d(u.value.address||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000"),1),s("div",Ht,"โทร. "+d(u.value.phone||"095-155-5706"),1)])]),s("div",Kt,[s("div",Qt,[s("div",Zt,d(Z(t)),1),s("div",Gt,d(se(t)||"⚠️ ยังไม่มีที่อยู่จัดส่ง (กรุณานำเข้าจาก Note หรือพิมพ์เพิ่ม)"),1),L(t)?(p(),m("div",Jt,[s("span",Xt,d(L(t)),1)])):g("",!0),s("div",en," โทร "+d(G(t)||"-"),1)])]),s("div",tn,[s("div",{class:"ls-meta-text system-name",title:`ชื่อลูกค้าในระบบ: ${t.name}`},[s("span",null,d(ie(t)),1),s("span",{class:"ls-contact-tag",onClick:x(a=>fe(t),["stop"]),title:"คลิกเพื่อสลับช่องทางติดต่อ (Line / LineOA / โทร)"}," ("+d(ae(t))+") ",9,sn)],8,nn),s("div",{class:"ls-meta-text payment-text",onClick:x(a=>le(t),["stop"]),title:"คลิกเพื่อสลับ โอน / COD"},d(F(t)),9,ln)])])),s("div",an,d(u.value.thankYouText||"🙏 ขอบคุณที่อุดหนุนนะคะ ❤️"),1)],2))),128))],2)]),re.value?(p(),Pe(Ee,{key:0,customer:re.value,addressBook:de.addressBook,onClose:e[19]||(e[19]=t=>T.value=null)},null,8,["customer","addressBook"])):g("",!0)]))}},fn=Oe(on,[["__scopeId","data-v-62c57e8c"]]);export{fn as default};
