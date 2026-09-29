import{r as z,m as ke,a as Ce,k as w,e as m,d as p,g as s,c as Te,f as g,t as d,j as b,w as E,v as V,h,F as R,i as _e,l as x,B as Le}from"./vendor-vue-DlktDI-O.js";import{u as X,r as ee}from"./vendor-firebase-BQi1YDe9.js";import{a as Pe,d as te}from"./errorHandler-h93_x-EL.js";import{n as O}from"./addressParser-C_hPM5uv.js";import Ne from"./CustomerAddressModal-DZV2Z_Gl.js";import{S as Y}from"./vendor-sweetalert-DE6NlnlT.js";const Ee={class:"slm-modal"},Oe={class:"slm-header no-print"},je={class:"slm-title"},qe={class:"slm-count-badge"},Me={class:"slm-controls no-print"},Fe={class:"slm-filter-group"},Ue={class:"slm-customer-selector"},Ve={class:"slm-selector-header"},Re={class:"slm-search-box"},Ye={class:"slm-quick-select-btns"},We={class:"slm-chips-scroll"},He=["onClick","title"],Ke={class:"chip-checkbox"},Qe={class:"chip-name"},Ze={key:0,class:"chip-items"},Ge=["onClick","title"],Je={key:0,class:"chip-active-lbl"},Xe=["onClick","title"],et=["onClick","title"],tt={key:2,class:"chip-warn-tag",title:"ยังไม่มีที่อยู่"},nt={key:0,class:"slm-no-chips"},st={class:"slm-options-row"},it={class:"slm-select-wrap"},lt={class:"slm-orient-tabs"},at={class:"slm-select-wrap"},ot={style:{display:"flex",gap:"8px","flex-wrap":"wrap"}},dt={key:0,class:"slm-sender-box"},rt={class:"slm-sender-grid"},ct={class:"slm-select-bar"},pt={style:{display:"flex","align-items":"center",gap:"12px","flex-wrap":"wrap"}},ut={class:"slm-check-all"},mt=["checked"],vt={key:0,class:"slm-addr-counter"},ft={class:"cnt-item has"},ht={key:0,class:"cnt-item missing"},gt={style:{display:"flex",gap:"8px"}},yt=["disabled"],bt={key:0,class:"slm-empty-state no-print"},kt=["onClick"],Ct={class:"banner-text"},_t={class:"highlight-label"},wt=["onClick"],$t={key:1,class:"label-main-grid"},xt={class:"ls-sender-col"},At={class:"ls-sender-info"},St={class:"ls-sender-name"},zt={class:"ls-sender-addr",style:{"white-space":"pre-line"}},Bt={class:"ls-sender-phone"},Dt={class:"ls-bottom-left"},It=["title"],Tt=["onClick"],Lt=["onClick"],Pt={class:"ls-receiver-col"},Nt={class:"ls-receiver-name"},Et={class:"ls-receiver-addr"},Ot={key:0,class:"ls-receiver-zip"},jt={class:"zip-big"},qt={class:"ls-receiver-phone"},Mt={key:2,class:"label-portrait-body"},Ft={class:"label-sender-block"},Ut={class:"sender-body"},Vt={class:"sender-name-line"},Rt={class:"sender-addr-line",style:{"white-space":"pre-line"}},Yt={class:"sender-phone-line"},Wt={class:"label-receiver-block"},Ht={class:"receiver-body"},Kt={class:"receiver-name"},Qt={class:"receiver-address"},Zt={key:0,class:"receiver-zipcode"},Gt={class:"zip-num"},Jt={class:"receiver-phone"},Xt={class:"portrait-meta-bottom"},en=["title"],tn=["onClick"],nn=["onClick"],sn={class:"label-thankyou-footer"},ln={__name:"ShippingLabelModal",props:{customers:{type:Array,default:()=>[]},addressBook:{type:Object,default:()=>({})},initialSelectedId:{type:String,default:null}},emits:["close"],setup(oe){const c=oe,k=z("unprinted"),A=z("landscape"),W=z("thermal-76x130"),H=z(!1),v=z([]),S=z(""),B=z(null),de=w(()=>B.value?c.customers.find(n=>n.id===B.value.id)||B.value:null),u=z({name:localStorage.getItem("manowzab_sender_name")||"มะนาวแซ่บ",phone:localStorage.getItem("manowzab_sender_phone")||"095-155-5706",address:localStorage.getItem("manowzab_sender_address")||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000",thankYouText:localStorage.getItem("manowzab_sender_thankyou")||"🙏 ขอบคุณที่อุดหนุนนะคะ ❤️"});ke(u,n=>{localStorage.setItem("manowzab_sender_name",n.name||""),localStorage.setItem("manowzab_sender_phone",n.phone||""),localStorage.setItem("manowzab_sender_address",n.address||""),localStorage.setItem("manowzab_sender_thankyou",n.thankYouText||"")},{deep:!0});function L(n){if(!n)return 1/0;const e=new Date;e.setHours(0,0,0,0);const t=new Date(n);return t.setHours(0,0,0,0),Math.ceil((t-e)/(1e3*60*60*24))}const $=w(()=>[...c.customers.filter(e=>c.initialSelectedId&&e.id===c.initialSelectedId?!0:e&&e.status!=="done"&&e.deliveryDate&&typeof e.deliveryDate=="string"&&e.deliveryDate.trim()!=="")].sort((e,t)=>{const a=L(e.deliveryDate),l=L(t.deliveryDate);return a!==l?a-l:(e.deliveryDate||"").localeCompare(t.deliveryDate||"")})),we=w(()=>$.value.filter(n=>!n.labelPrinted).length),re=w(()=>$.value.filter(n=>L(n.deliveryDate)===0).length),ce=w(()=>$.value.filter(n=>L(n.deliveryDate)===1).length),$e=w(()=>$.value.length),C=w(()=>{let n=$.value;if(k.value==="unprinted"?n=$.value.filter(e=>!e.labelPrinted):k.value==="today"?n=$.value.filter(e=>L(e.deliveryDate)===0):k.value==="pack-tonight"&&(n=$.value.filter(e=>L(e.deliveryDate)===1)),c.initialSelectedId){const e=$.value.find(t=>t.id===c.initialSelectedId);e&&!n.some(t=>t.id===c.initialSelectedId)&&(n=[e,...n])}if(S.value.trim()){const e=S.value.trim().toLowerCase();n=n.filter(t=>{const a=(t.name||"").toLowerCase(),l=(t.recipientName||"").toLowerCase(),i=(N(t)||"").toLowerCase();return a.includes(e)||l.includes(e)||i.includes(e)})}return n}),y=w(()=>C.value.filter(n=>v.value.includes(n.id))),pe=w(()=>y.value.filter(n=>!!N(n)).length),ue=w(()=>y.value.length-pe.value),xe=w(()=>C.value.length>0&&v.value.length===C.value.length);ke(()=>c.initialSelectedId,n=>{n?(k.value="all-requested",v.value=[n],S.value=""):(k.value="all-requested",v.value=C.value.map(e=>e.id))},{immediate:!0}),Ce(()=>{c.initialSelectedId?(k.value="all-requested",v.value=[c.initialSelectedId],S.value=""):(k.value="all-requested",v.value=C.value.map(n=>n.id))});function D(n){k.value=n,v.value=C.value.map(e=>e.id)}function Ae(n){n?v.value=C.value.map(e=>e.id):v.value=[]}function Se(n){const e=v.value.indexOf(n);e>-1?v.value.splice(e,1):v.value.push(n)}async function ze(n){const e=!n.labelPrinted;try{await X(ee(te,`delivery_customers/${n.id}`),{labelPrinted:e,labelPrintedAt:e?Date.now():null}),Y.fire({icon:"success",title:e?`ทำเครื่องหมาย "${n.name}" พิมพ์แล้ว`:`ยกเลิกสถานะพิมพ์แล้วของ "${n.name}"`,toast:!0,position:"top-end",timer:1500,showConfirmButton:!1})}catch(t){console.error("Error updating printed status:",t)}}function P(n){if(!n)return[];const e=O(n.name).replace(/[.#$[\]/]/g,"_"),t=n.addresses,a=c.addressBook&&c.addressBook[e]?.addresses,l=t||a;let i=[];if(Array.isArray(l)?i=l.filter(Boolean):l&&typeof l=="object"&&(i=Object.values(l).filter(Boolean)),i.length>0)return i;if(n.address&&n.address.trim()){const r=q(n);return r&&r.address?[r]:[]}return[]}function j(n){return P(n).length}function K(n){if(!n)return"";const e=P(n);if(!e||e.length===0)return"";if(n.selectedAddressId){const t=e.find(a=>a.id===n.selectedAddressId);if(t)return t.label||(t.recipientName?`${t.recipientName}`:"")}if(n.address&&n.address.trim()){const t=n.address.trim(),a=e.find(l=>l.address&&l.address.trim()===t);if(a)return a.label||(a.recipientName?`${a.recipientName}`:"")}return e[0]?.label||""}function q(n){if(n.address)return{recipientName:n.recipientName||"",phone:n.phone||"",address:n.address||"",postalCode:n.postalCode||""};const e=O(n.name).replace(/[.#$[\]/]/g,"_");return c.addressBook&&c.addressBook[e]?c.addressBook[e]:{recipientName:"",phone:"",address:"",postalCode:""}}function Q(n){if(n.recipientName&&n.recipientName.trim())return n.recipientName.trim();const e=q(n);return e&&e.recipientName&&e.recipientName.trim()?e.recipientName.trim():n.name}function Z(n){return q(n).phone}function N(n){return q(n).address}function I(n){const e=q(n);if(e.postalCode)return e.postalCode;const t=(e.address||"").match(/\b[1-9]\d{4}\b(?!\/|\d)/);return t?t[0]:""}function ne(n){const e=N(n)||"",t=I(n);return t?e.replace(new RegExp(`\\b${t}\\b(?![/\\d])`,"g"),"").replace(/\s+/g," ").trim():e}function se(n,e=15){const t=(n?.name||"-").trim();return t.length<=e?t:t.slice(0,e).trim()+"…"}function T(n){if(!n)return"";if(n.paymentType){const o=String(n.paymentType).trim().toLowerCase();if(o==="cod"||o==="ปลายทาง"||o==="เก็บเงินปลายทาง"||o==="เก็บปลายทาง")return"cod";if(o==="transfer"||o==="โอน"||o==="โอนเงิน")return"transfer"}const e=O(n.name).replace(/[.#$[\]/]/g,"_"),t=c.addressBook&&e?c.addressBook[e]:null;if(t&&t.paymentType){const o=String(t.paymentType).trim().toLowerCase();if(o==="cod"||o==="ปลายทาง"||o==="เก็บเงินปลายทาง"||o==="เก็บปลายทาง")return"cod";if(o==="transfer"||o==="โอน"||o==="โอนเงิน")return"transfer"}const a=P(n),l=n.selectedAddressId?a.find(o=>o.id===n.selectedAddressId):a[0];if(l&&l.paymentType){const o=String(l.paymentType).trim().toLowerCase();if(o==="cod"||o==="ปลายทาง"||o==="เก็บเงินปลายทาง"||o==="เก็บปลายทาง")return"cod";if(o==="transfer"||o==="โอน"||o==="โอนเงิน")return"transfer"}const i=(n.note||"").toLowerCase(),r=(n.address||"").toLowerCase();return i.includes("cod")||i.includes("ปลายทาง")||i.includes("เก็บเงิน")||r.includes("cod")||r.includes("ปลายทาง")?"cod":""}function Be(n){return T(n)==="cod"}function M(n){const e=T(n);if(e==="cod"){const t=(n?.note||"").match(/(?:cod|ปลายทาง)\s*[:=]?\s*(\d+)/i);return t&&t[1]?`COD (${t[1]}฿)`:"COD"}return e==="transfer"?"โอน":"ยังไม่ระบุ"}async function ie(n){if(!n)return;const e=T(n),t=e==="cod"?"transfer":e==="transfer"?"cod":"transfer";n.paymentType=t;const a=Date.now(),l=O(n.name).replace(/[.#$[\]/]/g,"_"),i={[`delivery_customers/${n.id}/paymentType`]:t,[`delivery_customers/${n.id}/updatedAt`]:a};l&&(i[`address_book/${l}/paymentType`]=t,i[`address_book/${l}/name`]=n.name.trim(),i[`address_book/${l}/updatedAt`]=a,c.addressBook&&c.addressBook[l]&&(c.addressBook[l].paymentType=t));const r=P(n);if(r.length>0){const o=r.map(_=>({..._,paymentType:n.selectedAddressId&&_.id===n.selectedAddressId||r.length===1?t:_.paymentType||t}));i[`delivery_customers/${n.id}/addresses`]=o,l&&(i[`address_book/${l}/addresses`]=o)}try{await X(ee(te),i),Y.fire({icon:"success",title:`บันทึกรูปแบบ "${n.name}" เป็น "${t==="cod"?"COD":"โอน"}" ไว้ในประวัติลูกค้าแล้ว`,toast:!0,position:"top-end",timer:1500,showConfirmButton:!1})}catch(o){console.error("Error toggling paymentType:",o)}}function me(n){if(!n)return"";if(n.contactChannel){const i=String(n.contactChannel).trim().toLowerCase();if(i==="lineoa"||i==="line_oa"||i==="line-oa")return"lineoa";if(i==="phone"||i==="tel"||i==="โทร"||i==="โทรศัพท์")return"phone";if(i==="line")return"line"}const e=O(n.name).replace(/[.#$[\]/]/g,"_"),t=c.addressBook&&e?c.addressBook[e]:null;if(t&&t.contactChannel){const i=String(t.contactChannel).trim().toLowerCase();if(i==="lineoa"||i==="line_oa"||i==="line-oa")return"lineoa";if(i==="phone"||i==="tel"||i==="โทร"||i==="โทรศัพท์")return"phone";if(i==="line")return"line"}const a=P(n),l=n.selectedAddressId?a.find(i=>i.id===n.selectedAddressId):a[0];if(l&&l.contactChannel){const i=String(l.contactChannel).trim().toLowerCase();if(i==="lineoa"||i==="line_oa"||i==="line-oa")return"lineoa";if(i==="phone"||i==="tel"||i==="โทร"||i==="โทรศัพท์")return"phone";if(i==="line")return"line"}return""}function le(n){const e=me(n);return e==="lineoa"?"LineOA":e==="phone"?"โทร":e==="line"?"Line":"-"}async function ve(n){if(!n)return;const e=me(n),t=e==="line"?"lineoa":e==="lineoa"?"phone":"line";n.contactChannel=t;const a=Date.now(),l=O(n.name).replace(/[.#$[\]/]/g,"_"),i={[`delivery_customers/${n.id}/contactChannel`]:t,[`delivery_customers/${n.id}/updatedAt`]:a};l&&(i[`address_book/${l}/contactChannel`]=t,i[`address_book/${l}/name`]=n.name.trim(),i[`address_book/${l}/updatedAt`]=a,c.addressBook&&c.addressBook[l]&&(c.addressBook[l].contactChannel=t));const r=P(n);if(r.length>0){const o=r.map(_=>({..._,contactChannel:n.selectedAddressId&&_.id===n.selectedAddressId||r.length===1?t:_.contactChannel||t}));i[`delivery_customers/${n.id}/addresses`]=o,l&&(i[`address_book/${l}/addresses`]=o)}try{await X(ee(te),i);const o=t==="lineoa"?"LineOA":t==="phone"?"โทรศัพท์":"Line";Y.fire({icon:"success",title:`บันทึกช่องทางติดต่อ "${n.name}" เป็น "${o}" เรียบร้อย`,toast:!0,position:"top-end",timer:1500,showConfirmButton:!1})}catch(o){console.error("Error toggling contactChannel:",o)}}function De(){if(y.value.length===0)return;const n=document.getElementById("manowzab-label-print-frame");n&&n.remove();const e=document.createElement("iframe");e.id="manowzab-label-print-frame",e.style.position="fixed",e.style.right="0",e.style.bottom="0",e.style.width="0",e.style.height="0",e.style.border="0",e.style.zIndex="-9999",document.body.appendChild(e);const t=A.value==="landscape",a=t?"130mm":"76mm",l=t?"76mm":"130mm",i=u.value.name||"มะนาวแซ่บ",r=u.value.phone||"095-155-5706",o=(u.value.address||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000").replace(/\n/g,"<br>"),_=u.value.thankYouText||"🙏 ขอบคุณที่อุดหนุนนะคะ ❤️",ae=y.value.map((f,G)=>{const U=Q(f),fe=ne(f)||"⚠️ ยังไม่มีที่อยู่จัดส่ง",J=I(f),he=Z(f)||"-";Be(f);const ge=M(f),ye=se(f),be=le(f);return t?`
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
                    <div class="meta-system-name">${ye} (${be})</div>
                    <div class="meta-payment-row">${ge}</div>
                  </div>
                </div>

                <!-- Right: Receiver -->
                <div class="ls-receiver">
                  <div class="receiver-name">${U}</div>
                  <div class="receiver-addr">${fe}</div>
                  ${J?`<div class="receiver-zip">${J}</div>`:""}
                  <div class="receiver-phone">โทร ${he}</div>
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
                <div class="receiver-name">${U}</div>
                <div class="receiver-addr">${fe}</div>
                ${J?`<div class="receiver-zip">${J}</div>`:""}
                <div class="receiver-phone">โทร ${he}</div>
              </div>

              <!-- Portrait Bottom-Left Meta (Plain Text) -->
              <div class="port-meta-bottom">
                <div class="meta-system-name">${ye} (${be})</div>
                <div class="meta-payment-row">${ge}</div>
              </div>

              <div class="card-footer">${_}</div>
            </div>
          </div>
        `}).join(""),F=e.contentWindow.document;F.open(),F.write(`
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
        ${ae}
      </body>
    </html>
  `),F.close(),setTimeout(async()=>{try{e.contentWindow&&e.contentWindow.document.fonts&&await e.contentWindow.document.fonts.ready}catch{}e.contentWindow.focus(),e.contentWindow.print();try{const f={},G=Date.now();y.value.forEach(U=>{f[`delivery_customers/${U.id}/labelPrinted`]=!0,f[`delivery_customers/${U.id}/labelPrintedAt`]=G}),Object.keys(f).length>0&&await X(ee(te),f)}catch(f){console.error("Error auto-updating labelPrinted status:",f)}},250)}function Ie(){if(y.value.length===0){Y.fire({icon:"warning",title:"ไม่มีรายการที่เลือก",text:"กรุณาเลือกรายการลูกค้าที่ต้องการส่งออกก่อนครับ"});return}const n=[["ลำดับ","ชื่อผู้รับ (พิมพ์บนกล่อง)","ชื่อในระบบ (CF)","รูปแบบการส่ง","เบอร์โทร","ที่อยู่","รหัสไปรษณีย์","จำนวนสินค้า","รอบส่ง","โน้ต","ผู้ส่ง","เบอร์ผู้ส่ง","ที่อยู่ผู้ส่ง"]];y.value.forEach((r,o)=>{const _=Q(r)||"",ae=Z(r)||"",F=N(r)||"",f=I(r)||"",G=M(r);n.push([o+1,`"${_.replace(/"/g,'""')}"`,`"${(r.name||"").replace(/"/g,'""')}"`,`"${G}"`,`"${ae}"`,`"${F.replace(/"/g,'""')}"`,`"${f}"`,r.itemCount||0,r.deliveryDate||"",`"${(r.note||"").replace(/"/g,'""')}"`,`"${(u.value.name||"").replace(/"/g,'""')}"`,`"${(u.value.phone||"").replace(/"/g,'""')}"`,`"${(u.value.address||"").replace(/"/g,'""')}"`])});const e="\uFEFF"+n.map(r=>r.join(",")).join(`
`),t=new Blob([e],{type:"text/csv;charset=utf-8;"}),a=URL.createObjectURL(t),l=document.createElement("a"),i=new Date().toISOString().split("T")[0];l.setAttribute("href",a),l.setAttribute("download",`รายการที่อยู่จัดส่ง_130x76_${i}.csv`),document.body.appendChild(l),l.click(),document.body.removeChild(l),Y.fire({icon:"success",title:"ส่งออกไฟล์สำเร็จ!",html:`
      <div style="text-align: left; font-size: 0.9em; line-height: 1.6;">
        ดาวน์โหลดไฟล์ <b>.csv</b> เรียบร้อยแล้ว<br>
        สามารถนำไฟล์นี้ไปกดเปิดในแอปเครื่องพิมพ์ (ปุ่ม <b>Excel</b>) เพื่อพิมพ์สติ๊กเกอร์รวดเดียวได้เลยครับ!
      </div>
    `,confirmButtonColor:"#3b82f6"})}return Ce(()=>{re.value>0?D("today"):ce.value>0?D("pack-tonight"):D("all-requested")}),(n,e)=>(p(),m("div",{class:"slm-overlay",onClick:e[20]||(e[20]=x(t=>n.$emit("close"),["self"]))},[s("div",Ee,[s("div",Oe,[s("div",je,[e[21]||(e[21]=s("span",null,"🏷️ ใบปะหน้าพัสดุ 130x76 mm (แนวนอน)",-1)),s("span",qe,d(y.value.length)+" รายการ",1)]),s("button",{class:"slm-close-btn",onClick:e[0]||(e[0]=t=>n.$emit("close")),title:"ปิด"},[...e[22]||(e[22]=[s("i",{class:"fa-solid fa-xmark"},null,-1)])])]),s("div",Me,[s("div",Fe,[s("button",{class:b(["slm-filter-btn",{active:k.value==="unprinted"}]),onClick:e[1]||(e[1]=t=>D("unprinted"))}," ⏳ ยังไม่พิมพ์ ("+d(we.value)+") ",3),s("button",{class:b(["slm-filter-btn",{active:k.value==="today"}]),onClick:e[2]||(e[2]=t=>D("today"))}," 🚨 ส่งวันนี้ ("+d(re.value)+") ",3),s("button",{class:b(["slm-filter-btn",{active:k.value==="pack-tonight"}]),onClick:e[3]||(e[3]=t=>D("pack-tonight"))}," 📦 แพ็คคืนนี้ ("+d(ce.value)+") ",3),s("button",{class:b(["slm-filter-btn",{active:k.value==="all-requested"}]),onClick:e[4]||(e[4]=t=>D("all-requested"))}," 🌐 ทั้งหมดที่รอส่ง ("+d($e.value)+") ",3)]),s("div",Ue,[s("div",Ve,[s("div",Re,[e[23]||(e[23]=s("i",{class:"fa-solid fa-magnifying-glass slm-search-icon"},null,-1)),E(s("input",{type:"text","onUpdate:modelValue":e[5]||(e[5]=t=>S.value=t),class:"slm-search-input",placeholder:"🔍 ค้นหาชื่อลูกค้า / ผู้รับ (เช่น หนิง, ปิยะวาท)..."},null,512),[[V,S.value]]),S.value?(p(),m("button",{key:0,class:"slm-clear-search",onClick:e[6]||(e[6]=t=>S.value="")},"✕")):g("",!0)]),s("div",Ye,[s("button",{class:"slm-mini-btn",onClick:e[7]||(e[7]=t=>v.value=C.value.map(a=>a.id))},[...e[24]||(e[24]=[s("i",{class:"fa-solid fa-check-double"},null,-1),h(" เลือกทั้งหมด ",-1)])]),s("button",{class:"slm-mini-btn",onClick:e[8]||(e[8]=t=>v.value=[])},[...e[25]||(e[25]=[s("i",{class:"fa-solid fa-xmark"},null,-1),h(" ยกเลิกทั้งหมด ",-1)])]),s("button",{class:"slm-mini-btn highlight",onClick:e[9]||(e[9]=t=>v.value=C.value.filter(a=>!a.labelPrinted).map(a=>a.id))},[...e[26]||(e[26]=[s("i",{class:"fa-solid fa-filter"},null,-1),h(" เฉพาะที่ยังไม่พิมพ์ ",-1)])])])]),s("div",We,[(p(!0),m(R,null,_e(C.value,t=>(p(),m("div",{key:t.id,class:b(["slm-cust-chip",{selected:v.value.includes(t.id),printed:t.labelPrinted,"no-address":!N(t)}]),onClick:a=>Se(t.id),title:`คลิกเพื่อ ${v.value.includes(t.id)?"ยกเลิก":"เลือก"} ${t.name}`},[s("span",Ke,[s("i",{class:b(["fa-solid",v.value.includes(t.id)?"fa-square-check":"fa-square"])},null,2)]),s("span",Qe,d(t.name),1),t.itemCount?(p(),m("span",Ze,"("+d(t.itemCount)+" ชิ้น)",1)):g("",!0),j(t)>1?(p(),m("span",{key:1,class:"chip-multi-addr-tag",onClick:x(a=>B.value=t,["stop"]),title:`ลูกค้ารายนี้มี ${j(t)} ที่อยู่ (เลือก: ${K(t)||"ที่อยู่นี้"}) — คลิกเพื่อเปลี่ยนที่อยู่จัดส่ง`},[e[27]||(e[27]=s("i",{class:"fa-solid fa-layer-group"},null,-1)),s("span",null,d(j(t))+" ที่อยู่",1),K(t)?(p(),m("span",Je,": "+d(K(t)),1)):g("",!0)],8,Ge)):g("",!0),s("span",{class:b(["chip-payment-tag",T(t)==="cod"?"is-cod":T(t)==="transfer"?"is-transfer":"is-unspecified"]),onClick:x(a=>ie(t),["stop"]),title:`รูปแบบจัดส่ง: ${M(t)} (คลิกเพื่อสลับระหว่าง โอน / COD)`},[T(t)==="cod"?(p(),m(R,{key:0},[h("💵 COD")],64)):T(t)==="transfer"?(p(),m(R,{key:1},[h("💳 โอน")],64)):(p(),m(R,{key:2},[h("❓ ยังไม่ระบุ")],64))],10,Xe),s("span",{class:b(["chip-status-tag",t.labelPrinted?"is-printed":"is-unprinted"]),onClick:x(a=>ze(t),["stop"]),title:t.labelPrinted?"พิมพ์แล้ว (คลิกเพื่อเปลี่ยนเป็นยังไม่พิมพ์)":"ยังไม่พิมพ์ (คลิกเพื่อเปลี่ยนเป็นพิมพ์แล้ว)"},[s("i",{class:b(t.labelPrinted?"fa-solid fa-circle-check":"fa-solid fa-print")},null,2),h(" "+d(t.labelPrinted?"พิมพ์แล้ว":"ยังไม่พิมพ์"),1)],10,et),N(t)?g("",!0):(p(),m("span",tt," ⚠️ รอที่อยู่ "))],10,He))),128)),C.value.length===0?(p(),m("div",nt," ไม่พบรายชื่อในหมวดนี้ ")):g("",!0)])]),s("div",st,[s("div",it,[e[28]||(e[28]=s("label",null,[s("i",{class:"fa-solid fa-rotate"}),h(" ทิศทาง:")],-1)),s("div",lt,[s("button",{class:b(["slm-orient-btn",{active:A.value==="landscape"}]),onClick:e[10]||(e[10]=t=>A.value="landscape")}," 🔄 แนวนอน (130x76mm) ",2),s("button",{class:b(["slm-orient-btn",{active:A.value==="portrait"}]),onClick:e[11]||(e[11]=t=>A.value="portrait")}," ↕️ แนวตั้ง (76x130mm) ",2)])]),s("div",at,[e[30]||(e[30]=s("label",null,[s("i",{class:"fa-solid fa-scroll"}),h(" ขนาดฉลาก:")],-1)),E(s("select",{"onUpdate:modelValue":e[12]||(e[12]=t=>W.value=t),class:"slm-select"},[...e[29]||(e[29]=[s("option",{value:"thermal-76x130"},"สติ๊กเกอร์ 76 x 130 mm (มาตรฐานของคุณ)",-1),s("option",{value:"thermal-100x150"},'สติ๊กเกอร์ 100 x 150 mm (4x6")',-1),s("option",{value:"thermal-80x100"},"สติ๊กเกอร์ 80 x 100 mm",-1),s("option",{value:"a4-grid"},"กระดาษ A4 (สติ๊กเกอร์ 2 คอลัมน์)",-1)])],512),[[Le,W.value]])]),s("div",ot,[s("button",{class:"slm-export-excel-btn",onClick:Ie,title:"ส่งออกไฟล์เพื่อนำเข้าไปเปิดในแอปเครื่องพิมพ์"},[...e[31]||(e[31]=[s("i",{class:"fa-solid fa-file-excel"},null,-1),h(" ส่งออก Excel เข้าแอปปริ้นเตอร์ ",-1)])]),s("button",{class:"slm-toggle-sender-btn",onClick:e[13]||(e[13]=t=>H.value=!H.value)},[e[32]||(e[32]=s("i",{class:"fa-solid fa-store"},null,-1)),h(" "+d(H.value?"ซ่อนข้อมูลร้าน":"แก้ไขข้อมูลร้านผู้ส่ง"),1)])])]),H.value?(p(),m("div",dt,[e[33]||(e[33]=s("div",{class:"slm-sender-title"},"🏠 ข้อมูลผู้ส่งและข้อความขอบคุณ (บันทึกจำไว้ในเครื่องอัตโนมัติ)",-1)),s("div",rt,[E(s("input",{type:"text","onUpdate:modelValue":e[14]||(e[14]=t=>u.value.name=t),class:"slm-input",placeholder:"ชื่อร้าน (เช่น มะนาวแซ่บ)"},null,512),[[V,u.value.name]]),E(s("input",{type:"text","onUpdate:modelValue":e[15]||(e[15]=t=>u.value.phone=t),class:"slm-input",placeholder:"เบอร์โทรผู้ส่ง"},null,512),[[V,u.value.phone]]),E(s("input",{type:"text","onUpdate:modelValue":e[16]||(e[16]=t=>u.value.address=t),class:"slm-input slm-col-span",placeholder:"ที่อยู่ผู้ส่ง (บ้านเลขที่ ตำบล อำเภอ จังหวัด รหัสไปรษณีย์)"},null,512),[[V,u.value.address]]),E(s("input",{type:"text","onUpdate:modelValue":e[17]||(e[17]=t=>u.value.thankYouText=t),class:"slm-input slm-col-span",placeholder:"ข้อความขอบคุณท้ายใบปะหน้า (เช่น 🙏 ขอบคุณที่อุดหนุนนะคะ ❤️)"},null,512),[[V,u.value.thankYouText]])])])):g("",!0),s("div",ct,[s("div",pt,[s("label",ut,[s("input",{type:"checkbox",checked:xe.value,onChange:e[18]||(e[18]=t=>Ae(t.target.checked))},null,40,mt),s("span",null,"เลือก "+d(v.value.length)+" จาก "+d(C.value.length)+" คน",1)]),y.value.length>0?(p(),m("span",vt,[s("span",ft,[e[34]||(e[34]=s("i",{class:"fa-solid fa-circle-check"},null,-1)),h(" มีที่อยู่ "+d(pe.value),1)]),ue.value>0?(p(),m("span",ht,[e[35]||(e[35]=s("i",{class:"fa-solid fa-circle-exclamation"},null,-1)),h(" รอที่อยู่ "+d(ue.value),1)])):g("",!0)])):g("",!0)]),s("div",gt,[s("button",{class:"btn btn-primary slm-print-btn",onClick:De,disabled:y.value.length===0},[e[36]||(e[36]=s("i",{class:"fa-solid fa-print"},null,-1)),h(" สั่งพิมพ์ใบปะหน้า ("+d(y.value.length)+" ใบ) ",1)],8,yt)])])]),s("div",{class:b(["slm-preview-area",["paper-"+W.value,"mode-"+A.value]])},[y.value.length===0?(p(),m("div",bt,[...e[37]||(e[37]=[s("i",{class:"fa-solid fa-box-open slm-empty-icon"},null,-1),s("div",null,"ไม่มีรายการที่เลือกพิมพ์ (กรุณาคลิกเลือกรายชื่อลูกค้าด้านบน)",-1)])])):g("",!0),(p(!0),m(R,null,_e(y.value,t=>(p(),m("div",{key:t.id,class:b(["shipping-label-card",["label-"+W.value,A.value==="landscape"?"layout-landscape":"layout-portrait"]])},[j(t)>1?(p(),m("div",{key:0,class:"label-multi-addr-banner no-print",onClick:a=>B.value=t,title:"คลิกเพื่อสลับหรือเลือกที่อยู่จัดส่ง"},[s("div",Ct,[e[40]||(e[40]=s("i",{class:"fa-solid fa-layer-group"},null,-1)),s("span",null,[e[38]||(e[38]=h("มี ",-1)),s("b",null,d(j(t))+" ที่อยู่",1),e[39]||(e[39]=h(" • กำลังเลือกส่งที่: ",-1)),s("b",_t,d(K(t)||"ที่อยู่นี้"),1)])]),s("button",{class:"banner-switch-btn",type:"button",onClick:x(a=>B.value=t,["stop"])},[...e[41]||(e[41]=[s("i",{class:"fa-solid fa-arrow-right-arrow-left"},null,-1),h(" สลับ/เลือกที่อยู่ ",-1)])],8,wt)],8,kt)):g("",!0),A.value==="landscape"?(p(),m("div",$t,[s("div",xt,[s("div",At,[s("div",St,d(u.value.name||"มะนาวแซ่บ"),1),s("div",zt,d(u.value.address||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000"),1),s("div",Bt,"โทร. "+d(u.value.phone||"095-155-5706"),1)]),s("div",Dt,[s("div",{class:"ls-meta-text system-name",title:`ชื่อลูกค้าในระบบ: ${t.name}`},[s("span",null,d(se(t)),1),s("span",{class:"ls-contact-tag",onClick:x(a=>ve(t),["stop"]),title:"คลิกเพื่อสลับช่องทางติดต่อ (Line / LineOA / โทร)"}," ("+d(le(t))+") ",9,Tt)],8,It),s("div",{class:"ls-meta-text payment-text",onClick:x(a=>ie(t),["stop"]),title:"คลิกเพื่อสลับ โอน / COD"},d(M(t)),9,Lt)])]),s("div",Pt,[s("div",Nt,d(Q(t)),1),s("div",Et,d(ne(t)||"⚠️ ยังไม่มีที่อยู่จัดส่ง (กรุณานำเข้าจาก Note หรือพิมพ์เพิ่ม)"),1),I(t)?(p(),m("div",Ot,[s("span",jt,d(I(t)),1)])):g("",!0),s("div",qt," โทร "+d(Z(t)||"-"),1)])])):(p(),m("div",Mt,[s("div",Ft,[s("div",Ut,[s("div",Vt,d(u.value.name||"มะนาวแซ่บ"),1),s("div",Rt,d(u.value.address||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000"),1),s("div",Yt,"โทร. "+d(u.value.phone||"095-155-5706"),1)])]),s("div",Wt,[s("div",Ht,[s("div",Kt,d(Q(t)),1),s("div",Qt,d(ne(t)||"⚠️ ยังไม่มีที่อยู่จัดส่ง (กรุณานำเข้าจาก Note หรือพิมพ์เพิ่ม)"),1),I(t)?(p(),m("div",Zt,[s("span",Gt,d(I(t)),1)])):g("",!0),s("div",Jt," โทร "+d(Z(t)||"-"),1)])]),s("div",Xt,[s("div",{class:"ls-meta-text system-name",title:`ชื่อลูกค้าในระบบ: ${t.name}`},[s("span",null,d(se(t)),1),s("span",{class:"ls-contact-tag",onClick:x(a=>ve(t),["stop"]),title:"คลิกเพื่อสลับช่องทางติดต่อ (Line / LineOA / โทร)"}," ("+d(le(t))+") ",9,tn)],8,en),s("div",{class:"ls-meta-text payment-text",onClick:x(a=>ie(t),["stop"]),title:"คลิกเพื่อสลับ โอน / COD"},d(M(t)),9,nn)])])),s("div",sn,d(u.value.thankYouText||"🙏 ขอบคุณที่อุดหนุนนะคะ ❤️"),1)],2))),128))],2)]),de.value?(p(),Te(Ne,{key:0,customer:de.value,addressBook:oe.addressBook,onClose:e[19]||(e[19]=t=>B.value=null)},null,8,["customer","addressBook"])):g("",!0)]))}},un=Pe(ln,[["__scopeId","data-v-a25f07c3"]]);export{un as default};
