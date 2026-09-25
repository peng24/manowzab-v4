import{r as z,q as ge,b as he,c as x,h as u,g as r,j as n,f as Ae,i as h,t as i,m as b,w as L,v as F,k as g,F as U,l as ye,p as I,D as De}from"./vendor-vue-Dee8fQRv.js";import{u as ne,r as le}from"./vendor-firebase-B6JxyUnY.js";import{a as Te,d as ie}from"./errorHandler-zjbC6QdE.js";import{n as G}from"./addressParser-CNmB7Rpm.js";import Be from"./CustomerAddressModal-KBbPx5Oq.js";import{S as J}from"./vendor-sweetalert-DE6NlnlT.js";const Ie={class:"slm-modal"},Pe={class:"slm-header no-print"},Ne={class:"slm-title"},Le={class:"slm-count-badge"},Ee={class:"slm-controls no-print"},je={class:"slm-filter-group"},Oe={class:"slm-customer-selector"},qe={class:"slm-selector-header"},Me={class:"slm-search-box"},Fe={class:"slm-quick-select-btns"},Ue={class:"slm-chips-scroll"},Ve=["onClick","title"],Re={class:"chip-checkbox"},Ye={class:"chip-name"},We={key:0,class:"chip-items"},He=["onClick","title"],Ke={key:0,class:"chip-active-lbl"},Qe=["onClick","title"],Ze=["onClick","title"],Ge={key:2,class:"chip-warn-tag",title:"ยังไม่มีที่อยู่"},Je={key:0,class:"slm-no-chips"},Xe={class:"slm-options-row"},et={class:"slm-select-wrap"},tt={class:"slm-orient-tabs"},st={class:"slm-select-wrap"},nt={style:{display:"flex",gap:"8px","flex-wrap":"wrap"}},lt={key:0,class:"slm-sender-box"},it={class:"slm-sender-grid"},at={class:"slm-select-bar"},ot={style:{display:"flex","align-items":"center",gap:"12px","flex-wrap":"wrap"}},dt={class:"slm-check-all"},rt=["checked"],ct={key:0,class:"slm-addr-counter"},pt={class:"cnt-item has"},ut={key:0,class:"cnt-item missing"},mt={style:{display:"flex",gap:"8px"}},vt=["disabled"],ft={key:0,class:"slm-empty-state no-print"},gt=["onClick"],ht={class:"banner-text"},yt={class:"highlight-label"},bt=["onClick"],kt={key:1,class:"label-main-grid"},wt={class:"ls-sender-col"},xt={class:"ls-sender-info"},_t={class:"ls-sender-name"},Ct={class:"ls-sender-addr",style:{"white-space":"pre-line"}},$t={class:"ls-sender-phone"},St={class:"ls-bottom-left"},zt=["title"],At=["onClick"],Dt={class:"ls-receiver-col"},Tt={class:"ls-receiver-name"},Bt={class:"ls-receiver-addr"},It={key:0,class:"ls-receiver-zip"},Pt={class:"zip-big"},Nt={class:"ls-receiver-phone"},Lt={key:2,class:"label-portrait-body"},Et={class:"label-sender-block"},jt={class:"sender-body"},Ot={class:"sender-name-line"},qt={class:"sender-addr-line",style:{"white-space":"pre-line"}},Mt={class:"sender-phone-line"},Ft={class:"label-receiver-block"},Ut={class:"receiver-body"},Vt={class:"receiver-name"},Rt={class:"receiver-address"},Yt={key:0,class:"receiver-zipcode"},Wt={class:"zip-num"},Ht={class:"receiver-phone"},Kt={class:"portrait-meta-bottom"},Qt=["title"],Zt=["onClick"],Gt={class:"label-thankyou-footer"},Jt={__name:"ShippingLabelModal",props:{customers:{type:Array,default:()=>[]},addressBook:{type:Object,default:()=>({})},initialSelectedId:{type:String,default:null}},emits:["close"],setup(ae){const m=ae,k=z("unprinted"),C=z("landscape"),V=z("thermal-76x130"),R=z(!1),v=z([]),$=z(""),A=z(null),oe=x(()=>A.value?m.customers.find(s=>s.id===A.value.id)||A.value:null),c=z({name:localStorage.getItem("manowzab_sender_name")||"มะนาวแซ่บ",phone:localStorage.getItem("manowzab_sender_phone")||"095-155-5706",address:localStorage.getItem("manowzab_sender_address")||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000",thankYouText:localStorage.getItem("manowzab_sender_thankyou")||"🙏 ขอบคุณที่อุดหนุนนะคะ ❤️"});ge(c,s=>{localStorage.setItem("manowzab_sender_name",s.name||""),localStorage.setItem("manowzab_sender_phone",s.phone||""),localStorage.setItem("manowzab_sender_address",s.address||""),localStorage.setItem("manowzab_sender_thankyou",s.thankYouText||"")},{deep:!0});function P(s){if(!s)return 1/0;const e=new Date;e.setHours(0,0,0,0);const t=new Date(s);return t.setHours(0,0,0,0),Math.ceil((t-e)/(1e3*60*60*24))}const _=x(()=>[...m.customers.filter(e=>m.initialSelectedId&&e.id===m.initialSelectedId?!0:e&&e.status!=="done"&&e.deliveryDate&&typeof e.deliveryDate=="string"&&e.deliveryDate.trim()!=="")].sort((e,t)=>{const l=P(e.deliveryDate),a=P(t.deliveryDate);return l!==a?l-a:(e.deliveryDate||"").localeCompare(t.deliveryDate||"")})),be=x(()=>_.value.filter(s=>!s.labelPrinted).length),de=x(()=>_.value.filter(s=>P(s.deliveryDate)===0).length),re=x(()=>_.value.filter(s=>P(s.deliveryDate)===1).length),ke=x(()=>_.value.length),w=x(()=>{let s=_.value;if(k.value==="unprinted"?s=_.value.filter(e=>!e.labelPrinted):k.value==="today"?s=_.value.filter(e=>P(e.deliveryDate)===0):k.value==="pack-tonight"&&(s=_.value.filter(e=>P(e.deliveryDate)===1)),m.initialSelectedId){const e=_.value.find(t=>t.id===m.initialSelectedId);e&&!s.some(t=>t.id===m.initialSelectedId)&&(s=[e,...s])}if($.value.trim()){const e=$.value.trim().toLowerCase();s=s.filter(t=>{const l=(t.name||"").toLowerCase(),a=(t.recipientName||"").toLowerCase(),p=(N(t)||"").toLowerCase();return l.includes(e)||a.includes(e)||p.includes(e)})}return s}),y=x(()=>w.value.filter(s=>v.value.includes(s.id))),ce=x(()=>y.value.filter(s=>!!N(s)).length),pe=x(()=>y.value.length-ce.value),we=x(()=>w.value.length>0&&v.value.length===w.value.length);ge(()=>m.initialSelectedId,s=>{s?(k.value="all-requested",v.value=[s],$.value=""):(k.value="all-requested",v.value=w.value.map(e=>e.id))},{immediate:!0}),he(()=>{m.initialSelectedId?(k.value="all-requested",v.value=[m.initialSelectedId],$.value=""):(k.value="all-requested",v.value=w.value.map(s=>s.id))});function D(s){k.value=s,v.value=w.value.map(e=>e.id)}function xe(s){s?v.value=w.value.map(e=>e.id):v.value=[]}function _e(s){const e=v.value.indexOf(s);e>-1?v.value.splice(e,1):v.value.push(s)}async function Ce(s){const e=!s.labelPrinted;try{await ne(le(ie,`delivery_customers/${s.id}`),{labelPrinted:e,labelPrintedAt:e?Date.now():null}),J.fire({icon:"success",title:e?`ทำเครื่องหมาย "${s.name}" พิมพ์แล้ว`:`ยกเลิกสถานะพิมพ์แล้วของ "${s.name}"`,toast:!0,position:"top-end",timer:1500,showConfirmButton:!1})}catch(t){console.error("Error updating printed status:",t)}}function Y(s){if(!s)return[];const e=G(s.name).replace(/[.#$[\]/]/g,"_"),t=s.addresses,l=m.addressBook&&m.addressBook[e]?.addresses,a=t||l;let p=[];if(Array.isArray(a)?p=a.filter(Boolean):a&&typeof a=="object"&&(p=Object.values(a).filter(Boolean)),p.length>0)return p;if(s.address&&s.address.trim()){const d=j(s);return d&&d.address?[d]:[]}return[]}function E(s){return Y(s).length}function W(s){if(!s)return"";const e=Y(s);if(!e||e.length===0)return"";if(s.selectedAddressId){const t=e.find(l=>l.id===s.selectedAddressId);if(t)return t.label||(t.recipientName?`${t.recipientName}`:"")}if(s.address&&s.address.trim()){const t=s.address.trim(),l=e.find(a=>a.address&&a.address.trim()===t);if(l)return l.label||(l.recipientName?`${l.recipientName}`:"")}return e[0]?.label||""}function j(s){if(s.address)return{recipientName:s.recipientName||"",phone:s.phone||"",address:s.address||"",postalCode:s.postalCode||""};const e=G(s.name).replace(/[.#$[\]/]/g,"_");return m.addressBook&&m.addressBook[e]?m.addressBook[e]:{recipientName:"",phone:"",address:"",postalCode:""}}function H(s){if(s.recipientName&&s.recipientName.trim())return s.recipientName.trim();const e=j(s);return e&&e.recipientName&&e.recipientName.trim()?e.recipientName.trim():s.name}function K(s){return j(s).phone}function N(s){return j(s).address}function T(s){const e=j(s);if(e.postalCode)return e.postalCode;const t=(e.address||"").match(/\b[1-9]\d{4}\b(?!\/|\d)/);return t?t[0]:""}function X(s){const e=N(s)||"",t=T(s);return t?e.replace(new RegExp(`\\b${t}\\b(?![/\\d])`,"g"),"").replace(/\s+/g," ").trim():e}function ee(s,e=15){const t=(s?.name||"-").trim();return t.length<=e?t:t.slice(0,e).trim()+"…"}function B(s){if(!s)return"";if(s.paymentType){const o=String(s.paymentType).trim().toLowerCase();if(o==="cod"||o==="ปลายทาง"||o==="เก็บเงินปลายทาง"||o==="เก็บปลายทาง")return"cod";if(o==="transfer"||o==="โอน"||o==="โอนเงิน")return"transfer"}const e=G(s.name).replace(/[.#$[\]/]/g,"_"),t=m.addressBook&&e?m.addressBook[e]:null;if(t&&t.paymentType){const o=String(t.paymentType).trim().toLowerCase();if(o==="cod"||o==="ปลายทาง"||o==="เก็บเงินปลายทาง"||o==="เก็บปลายทาง")return"cod";if(o==="transfer"||o==="โอน"||o==="โอนเงิน")return"transfer"}const l=Y(s),a=s.selectedAddressId?l.find(o=>o.id===s.selectedAddressId):l[0];if(a&&a.paymentType){const o=String(a.paymentType).trim().toLowerCase();if(o==="cod"||o==="ปลายทาง"||o==="เก็บเงินปลายทาง"||o==="เก็บปลายทาง")return"cod";if(o==="transfer"||o==="โอน"||o==="โอนเงิน")return"transfer"}const p=(s.note||"").toLowerCase(),d=(s.address||"").toLowerCase();return p.includes("cod")||p.includes("ปลายทาง")||p.includes("เก็บเงิน")||d.includes("cod")||d.includes("ปลายทาง")?"cod":""}function $e(s){return B(s)==="cod"}function O(s){const e=B(s);if(e==="cod"){const t=(s?.note||"").match(/(?:cod|ปลายทาง)\s*[:=]?\s*(\d+)/i);return t&&t[1]?`COD (${t[1]}฿)`:"COD"}return e==="transfer"?"โอน":"ยังไม่ระบุ"}async function te(s){if(!s)return;const e=B(s),t=e==="cod"?"transfer":e==="transfer"?"cod":"transfer";s.paymentType=t;const l=Date.now(),a=G(s.name).replace(/[.#$[\]/]/g,"_"),p={[`delivery_customers/${s.id}/paymentType`]:t,[`delivery_customers/${s.id}/updatedAt`]:l};a&&(p[`address_book/${a}/paymentType`]=t,p[`address_book/${a}/name`]=s.name.trim(),p[`address_book/${a}/updatedAt`]=l,m.addressBook&&m.addressBook[a]&&(m.addressBook[a].paymentType=t));const d=Y(s);if(d.length>0){const o=d.map(S=>({...S,paymentType:s.selectedAddressId&&S.id===s.selectedAddressId||d.length===1?t:S.paymentType||t}));p[`delivery_customers/${s.id}/addresses`]=o,a&&(p[`address_book/${a}/addresses`]=o)}try{await ne(le(ie),p),J.fire({icon:"success",title:`บันทึกรูปแบบ "${s.name}" เป็น "${t==="cod"?"COD":"โอน"}" ไว้ในประวัติลูกค้าแล้ว`,toast:!0,position:"top-end",timer:1500,showConfirmButton:!1})}catch(o){console.error("Error toggling paymentType:",o)}}function Se(){if(y.value.length===0)return;const s=document.getElementById("manowzab-label-print-frame");s&&s.remove();const e=document.createElement("iframe");e.id="manowzab-label-print-frame",e.style.position="fixed",e.style.right="0",e.style.bottom="0",e.style.width="0",e.style.height="0",e.style.border="0",e.style.zIndex="-9999",document.body.appendChild(e);const t=C.value==="landscape",l=t?"130mm":"76mm",a=t?"76mm":"130mm",p=c.value.name||"มะนาวแซ่บ",d=c.value.phone||"095-155-5706",o=(c.value.address||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000").replace(/\n/g,"<br>"),S=c.value.thankYouText||"🙏 ขอบคุณที่อุดหนุนนะคะ ❤️",se=y.value.map((f,Q)=>{const M=H(f),ue=X(f)||"⚠️ ยังไม่มีที่อยู่จัดส่ง",Z=T(f),me=K(f)||"-";$e(f);const ve=O(f),fe=ee(f);return t?`
          <div class="print-page">
            <div class="print-card landscape">
              <div class="card-grid">
                <!-- Left: Sender + Bottom-Left System Info -->
                <div class="ls-sender">
                  <div class="sender-top-info">
                    <div class="sender-name">${p}</div>
                    <div class="sender-addr">${o}</div>
                    <div class="sender-phone">โทร. ${d}</div>
                  </div>

                  <!-- 📌 Bottom-Left Meta on Printed Label (Plain Text) -->
                  <div class="ls-meta-bottom">
                    <div class="meta-system-name">${fe}</div>
                    <div class="meta-payment-row">${ve}</div>
                  </div>
                </div>

                <!-- Right: Receiver -->
                <div class="ls-receiver">
                  <div class="receiver-name">${M}</div>
                  <div class="receiver-addr">${ue}</div>
                  ${Z?`<div class="receiver-zip">${Z}</div>`:""}
                  <div class="receiver-phone">โทร ${me}</div>
                </div>
              </div>

              <!-- Thank you footer -->
              <div class="card-footer">${S}</div>
            </div>
          </div>
        `:`
          <div class="print-page">
            <div class="print-card portrait">
              <div class="port-sender">
                <div class="sender-name">${p}</div>
                <div class="sender-addr">${o}</div>
                <div class="sender-phone">โทร. ${d}</div>
              </div>

              <div class="port-receiver">
                <div class="receiver-name">${M}</div>
                <div class="receiver-addr">${ue}</div>
                ${Z?`<div class="receiver-zip">${Z}</div>`:""}
                <div class="receiver-phone">โทร ${me}</div>
              </div>

              <!-- Portrait Bottom-Left Meta (Plain Text) -->
              <div class="port-meta-bottom">
                <div class="meta-system-name">${fe}</div>
                <div class="meta-payment-row">${ve}</div>
              </div>

              <div class="card-footer">${S}</div>
            </div>
          </div>
        `}).join(""),q=e.contentWindow.document;q.open(),q.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>พิมพ์ใบปะหน้าพัสดุ - ${p}</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: ${l} ${a} ${t?"landscape":"portrait"};
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
            width: ${l};
            height: ${a};
            max-width: ${l};
            max-height: ${a};
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
        ${se}
      </body>
    </html>
  `),q.close(),setTimeout(async()=>{try{e.contentWindow&&e.contentWindow.document.fonts&&await e.contentWindow.document.fonts.ready}catch{}e.contentWindow.focus(),e.contentWindow.print();try{const f={},Q=Date.now();y.value.forEach(M=>{f[`delivery_customers/${M.id}/labelPrinted`]=!0,f[`delivery_customers/${M.id}/labelPrintedAt`]=Q}),Object.keys(f).length>0&&await ne(le(ie),f)}catch(f){console.error("Error auto-updating labelPrinted status:",f)}},250)}function ze(){if(y.value.length===0){J.fire({icon:"warning",title:"ไม่มีรายการที่เลือก",text:"กรุณาเลือกรายการลูกค้าที่ต้องการส่งออกก่อนครับ"});return}const s=[["ลำดับ","ชื่อผู้รับ (พิมพ์บนกล่อง)","ชื่อในระบบ (CF)","รูปแบบการส่ง","เบอร์โทร","ที่อยู่","รหัสไปรษณีย์","จำนวนสินค้า","รอบส่ง","โน้ต","ผู้ส่ง","เบอร์ผู้ส่ง","ที่อยู่ผู้ส่ง"]];y.value.forEach((d,o)=>{const S=H(d)||"",se=K(d)||"",q=N(d)||"",f=T(d)||"",Q=O(d);s.push([o+1,`"${S.replace(/"/g,'""')}"`,`"${(d.name||"").replace(/"/g,'""')}"`,`"${Q}"`,`"${se}"`,`"${q.replace(/"/g,'""')}"`,`"${f}"`,d.itemCount||0,d.deliveryDate||"",`"${(d.note||"").replace(/"/g,'""')}"`,`"${(c.value.name||"").replace(/"/g,'""')}"`,`"${(c.value.phone||"").replace(/"/g,'""')}"`,`"${(c.value.address||"").replace(/"/g,'""')}"`])});const e="\uFEFF"+s.map(d=>d.join(",")).join(`
`),t=new Blob([e],{type:"text/csv;charset=utf-8;"}),l=URL.createObjectURL(t),a=document.createElement("a"),p=new Date().toISOString().split("T")[0];a.setAttribute("href",l),a.setAttribute("download",`รายการที่อยู่จัดส่ง_130x76_${p}.csv`),document.body.appendChild(a),a.click(),document.body.removeChild(a),J.fire({icon:"success",title:"ส่งออกไฟล์สำเร็จ!",html:`
      <div style="text-align: left; font-size: 0.9em; line-height: 1.6;">
        ดาวน์โหลดไฟล์ <b>.csv</b> เรียบร้อยแล้ว<br>
        สามารถนำไฟล์นี้ไปกดเปิดในแอปเครื่องพิมพ์ (ปุ่ม <b>Excel</b>) เพื่อพิมพ์สติ๊กเกอร์รวดเดียวได้เลยครับ!
      </div>
    `,confirmButtonColor:"#3b82f6"})}return he(()=>{de.value>0?D("today"):re.value>0?D("pack-tonight"):D("all-requested")}),(s,e)=>(r(),u("div",{class:"slm-overlay",onClick:e[20]||(e[20]=I(t=>s.$emit("close"),["self"]))},[n("div",Ie,[n("div",Pe,[n("div",Ne,[e[21]||(e[21]=n("span",null,"🏷️ ใบปะหน้าพัสดุ 130x76 mm (แนวนอน)",-1)),n("span",Le,i(y.value.length)+" รายการ",1)]),n("button",{class:"slm-close-btn",onClick:e[0]||(e[0]=t=>s.$emit("close")),title:"ปิด"},[...e[22]||(e[22]=[n("i",{class:"fa-solid fa-xmark"},null,-1)])])]),n("div",Ee,[n("div",je,[n("button",{class:b(["slm-filter-btn",{active:k.value==="unprinted"}]),onClick:e[1]||(e[1]=t=>D("unprinted"))}," ⏳ ยังไม่พิมพ์ ("+i(be.value)+") ",3),n("button",{class:b(["slm-filter-btn",{active:k.value==="today"}]),onClick:e[2]||(e[2]=t=>D("today"))}," 🚨 ส่งวันนี้ ("+i(de.value)+") ",3),n("button",{class:b(["slm-filter-btn",{active:k.value==="pack-tonight"}]),onClick:e[3]||(e[3]=t=>D("pack-tonight"))}," 📦 แพ็คคืนนี้ ("+i(re.value)+") ",3),n("button",{class:b(["slm-filter-btn",{active:k.value==="all-requested"}]),onClick:e[4]||(e[4]=t=>D("all-requested"))}," 🌐 ทั้งหมดที่รอส่ง ("+i(ke.value)+") ",3)]),n("div",Oe,[n("div",qe,[n("div",Me,[e[23]||(e[23]=n("i",{class:"fa-solid fa-magnifying-glass slm-search-icon"},null,-1)),L(n("input",{type:"text","onUpdate:modelValue":e[5]||(e[5]=t=>$.value=t),class:"slm-search-input",placeholder:"🔍 ค้นหาชื่อลูกค้า / ผู้รับ (เช่น หนิง, ปิยะวาท)..."},null,512),[[F,$.value]]),$.value?(r(),u("button",{key:0,class:"slm-clear-search",onClick:e[6]||(e[6]=t=>$.value="")},"✕")):h("",!0)]),n("div",Fe,[n("button",{class:"slm-mini-btn",onClick:e[7]||(e[7]=t=>v.value=w.value.map(l=>l.id))},[...e[24]||(e[24]=[n("i",{class:"fa-solid fa-check-double"},null,-1),g(" เลือกทั้งหมด ",-1)])]),n("button",{class:"slm-mini-btn",onClick:e[8]||(e[8]=t=>v.value=[])},[...e[25]||(e[25]=[n("i",{class:"fa-solid fa-xmark"},null,-1),g(" ยกเลิกทั้งหมด ",-1)])]),n("button",{class:"slm-mini-btn highlight",onClick:e[9]||(e[9]=t=>v.value=w.value.filter(l=>!l.labelPrinted).map(l=>l.id))},[...e[26]||(e[26]=[n("i",{class:"fa-solid fa-filter"},null,-1),g(" เฉพาะที่ยังไม่พิมพ์ ",-1)])])])]),n("div",Ue,[(r(!0),u(U,null,ye(w.value,t=>(r(),u("div",{key:t.id,class:b(["slm-cust-chip",{selected:v.value.includes(t.id),printed:t.labelPrinted,"no-address":!N(t)}]),onClick:l=>_e(t.id),title:`คลิกเพื่อ ${v.value.includes(t.id)?"ยกเลิก":"เลือก"} ${t.name}`},[n("span",Re,[n("i",{class:b(["fa-solid",v.value.includes(t.id)?"fa-square-check":"fa-square"])},null,2)]),n("span",Ye,i(t.name),1),t.itemCount?(r(),u("span",We,"("+i(t.itemCount)+" ชิ้น)",1)):h("",!0),E(t)>1?(r(),u("span",{key:1,class:"chip-multi-addr-tag",onClick:I(l=>A.value=t,["stop"]),title:`ลูกค้ารายนี้มี ${E(t)} ที่อยู่ (เลือก: ${W(t)||"ที่อยู่นี้"}) — คลิกเพื่อเปลี่ยนที่อยู่จัดส่ง`},[e[27]||(e[27]=n("i",{class:"fa-solid fa-layer-group"},null,-1)),n("span",null,i(E(t))+" ที่อยู่",1),W(t)?(r(),u("span",Ke,": "+i(W(t)),1)):h("",!0)],8,He)):h("",!0),n("span",{class:b(["chip-payment-tag",B(t)==="cod"?"is-cod":B(t)==="transfer"?"is-transfer":"is-unspecified"]),onClick:I(l=>te(t),["stop"]),title:`รูปแบบจัดส่ง: ${O(t)} (คลิกเพื่อสลับระหว่าง โอน / COD)`},[B(t)==="cod"?(r(),u(U,{key:0},[g("💵 COD")],64)):B(t)==="transfer"?(r(),u(U,{key:1},[g("💳 โอน")],64)):(r(),u(U,{key:2},[g("❓ ยังไม่ระบุ")],64))],10,Qe),n("span",{class:b(["chip-status-tag",t.labelPrinted?"is-printed":"is-unprinted"]),onClick:I(l=>Ce(t),["stop"]),title:t.labelPrinted?"พิมพ์แล้ว (คลิกเพื่อเปลี่ยนเป็นยังไม่พิมพ์)":"ยังไม่พิมพ์ (คลิกเพื่อเปลี่ยนเป็นพิมพ์แล้ว)"},[n("i",{class:b(t.labelPrinted?"fa-solid fa-circle-check":"fa-solid fa-print")},null,2),g(" "+i(t.labelPrinted?"พิมพ์แล้ว":"ยังไม่พิมพ์"),1)],10,Ze),N(t)?h("",!0):(r(),u("span",Ge," ⚠️ รอที่อยู่ "))],10,Ve))),128)),w.value.length===0?(r(),u("div",Je," ไม่พบรายชื่อในหมวดนี้ ")):h("",!0)])]),n("div",Xe,[n("div",et,[e[28]||(e[28]=n("label",null,[n("i",{class:"fa-solid fa-rotate"}),g(" ทิศทาง:")],-1)),n("div",tt,[n("button",{class:b(["slm-orient-btn",{active:C.value==="landscape"}]),onClick:e[10]||(e[10]=t=>C.value="landscape")}," 🔄 แนวนอน (130x76mm) ",2),n("button",{class:b(["slm-orient-btn",{active:C.value==="portrait"}]),onClick:e[11]||(e[11]=t=>C.value="portrait")}," ↕️ แนวตั้ง (76x130mm) ",2)])]),n("div",st,[e[30]||(e[30]=n("label",null,[n("i",{class:"fa-solid fa-scroll"}),g(" ขนาดฉลาก:")],-1)),L(n("select",{"onUpdate:modelValue":e[12]||(e[12]=t=>V.value=t),class:"slm-select"},[...e[29]||(e[29]=[n("option",{value:"thermal-76x130"},"สติ๊กเกอร์ 76 x 130 mm (มาตรฐานของคุณ)",-1),n("option",{value:"thermal-100x150"},'สติ๊กเกอร์ 100 x 150 mm (4x6")',-1),n("option",{value:"thermal-80x100"},"สติ๊กเกอร์ 80 x 100 mm",-1),n("option",{value:"a4-grid"},"กระดาษ A4 (สติ๊กเกอร์ 2 คอลัมน์)",-1)])],512),[[De,V.value]])]),n("div",nt,[n("button",{class:"slm-export-excel-btn",onClick:ze,title:"ส่งออกไฟล์เพื่อนำเข้าไปเปิดในแอปเครื่องพิมพ์"},[...e[31]||(e[31]=[n("i",{class:"fa-solid fa-file-excel"},null,-1),g(" ส่งออก Excel เข้าแอปปริ้นเตอร์ ",-1)])]),n("button",{class:"slm-toggle-sender-btn",onClick:e[13]||(e[13]=t=>R.value=!R.value)},[e[32]||(e[32]=n("i",{class:"fa-solid fa-store"},null,-1)),g(" "+i(R.value?"ซ่อนข้อมูลร้าน":"แก้ไขข้อมูลร้านผู้ส่ง"),1)])])]),R.value?(r(),u("div",lt,[e[33]||(e[33]=n("div",{class:"slm-sender-title"},"🏠 ข้อมูลผู้ส่งและข้อความขอบคุณ (บันทึกจำไว้ในเครื่องอัตโนมัติ)",-1)),n("div",it,[L(n("input",{type:"text","onUpdate:modelValue":e[14]||(e[14]=t=>c.value.name=t),class:"slm-input",placeholder:"ชื่อร้าน (เช่น มะนาวแซ่บ)"},null,512),[[F,c.value.name]]),L(n("input",{type:"text","onUpdate:modelValue":e[15]||(e[15]=t=>c.value.phone=t),class:"slm-input",placeholder:"เบอร์โทรผู้ส่ง"},null,512),[[F,c.value.phone]]),L(n("input",{type:"text","onUpdate:modelValue":e[16]||(e[16]=t=>c.value.address=t),class:"slm-input slm-col-span",placeholder:"ที่อยู่ผู้ส่ง (บ้านเลขที่ ตำบล อำเภอ จังหวัด รหัสไปรษณีย์)"},null,512),[[F,c.value.address]]),L(n("input",{type:"text","onUpdate:modelValue":e[17]||(e[17]=t=>c.value.thankYouText=t),class:"slm-input slm-col-span",placeholder:"ข้อความขอบคุณท้ายใบปะหน้า (เช่น 🙏 ขอบคุณที่อุดหนุนนะคะ ❤️)"},null,512),[[F,c.value.thankYouText]])])])):h("",!0),n("div",at,[n("div",ot,[n("label",dt,[n("input",{type:"checkbox",checked:we.value,onChange:e[18]||(e[18]=t=>xe(t.target.checked))},null,40,rt),n("span",null,"เลือก "+i(v.value.length)+" จาก "+i(w.value.length)+" คน",1)]),y.value.length>0?(r(),u("span",ct,[n("span",pt,[e[34]||(e[34]=n("i",{class:"fa-solid fa-circle-check"},null,-1)),g(" มีที่อยู่ "+i(ce.value),1)]),pe.value>0?(r(),u("span",ut,[e[35]||(e[35]=n("i",{class:"fa-solid fa-circle-exclamation"},null,-1)),g(" รอที่อยู่ "+i(pe.value),1)])):h("",!0)])):h("",!0)]),n("div",mt,[n("button",{class:"btn btn-primary slm-print-btn",onClick:Se,disabled:y.value.length===0},[e[36]||(e[36]=n("i",{class:"fa-solid fa-print"},null,-1)),g(" สั่งพิมพ์ใบปะหน้า ("+i(y.value.length)+" ใบ) ",1)],8,vt)])])]),n("div",{class:b(["slm-preview-area",["paper-"+V.value,"mode-"+C.value]])},[y.value.length===0?(r(),u("div",ft,[...e[37]||(e[37]=[n("i",{class:"fa-solid fa-box-open slm-empty-icon"},null,-1),n("div",null,"ไม่มีรายการที่เลือกพิมพ์ (กรุณาคลิกเลือกรายชื่อลูกค้าด้านบน)",-1)])])):h("",!0),(r(!0),u(U,null,ye(y.value,t=>(r(),u("div",{key:t.id,class:b(["shipping-label-card",["label-"+V.value,C.value==="landscape"?"layout-landscape":"layout-portrait"]])},[E(t)>1?(r(),u("div",{key:0,class:"label-multi-addr-banner no-print",onClick:l=>A.value=t,title:"คลิกเพื่อสลับหรือเลือกที่อยู่จัดส่ง"},[n("div",ht,[e[40]||(e[40]=n("i",{class:"fa-solid fa-layer-group"},null,-1)),n("span",null,[e[38]||(e[38]=g("มี ",-1)),n("b",null,i(E(t))+" ที่อยู่",1),e[39]||(e[39]=g(" • กำลังเลือกส่งที่: ",-1)),n("b",yt,i(W(t)||"ที่อยู่นี้"),1)])]),n("button",{class:"banner-switch-btn",type:"button",onClick:I(l=>A.value=t,["stop"])},[...e[41]||(e[41]=[n("i",{class:"fa-solid fa-arrow-right-arrow-left"},null,-1),g(" สลับ/เลือกที่อยู่ ",-1)])],8,bt)],8,gt)):h("",!0),C.value==="landscape"?(r(),u("div",kt,[n("div",wt,[n("div",xt,[n("div",_t,i(c.value.name||"มะนาวแซ่บ"),1),n("div",Ct,i(c.value.address||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000"),1),n("div",$t,"โทร. "+i(c.value.phone||"095-155-5706"),1)]),n("div",St,[n("div",{class:"ls-meta-text system-name",title:`ชื่อลูกค้าในระบบ: ${t.name}`},i(ee(t)),9,zt),n("div",{class:"ls-meta-text payment-text",onClick:I(l=>te(t),["stop"]),title:"คลิกเพื่อสลับ โอน / COD"},i(O(t)),9,At)])]),n("div",Dt,[n("div",Tt,i(H(t)),1),n("div",Bt,i(X(t)||"⚠️ ยังไม่มีที่อยู่จัดส่ง (กรุณานำเข้าจาก Note หรือพิมพ์เพิ่ม)"),1),T(t)?(r(),u("div",It,[n("span",Pt,i(T(t)),1)])):h("",!0),n("div",Nt," โทร "+i(K(t)||"-"),1)])])):(r(),u("div",Lt,[n("div",Et,[n("div",jt,[n("div",Ot,i(c.value.name||"มะนาวแซ่บ"),1),n("div",qt,i(c.value.address||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000"),1),n("div",Mt,"โทร. "+i(c.value.phone||"095-155-5706"),1)])]),n("div",Ft,[n("div",Ut,[n("div",Vt,i(H(t)),1),n("div",Rt,i(X(t)||"⚠️ ยังไม่มีที่อยู่จัดส่ง (กรุณานำเข้าจาก Note หรือพิมพ์เพิ่ม)"),1),T(t)?(r(),u("div",Yt,[n("span",Wt,i(T(t)),1)])):h("",!0),n("div",Ht," โทร "+i(K(t)||"-"),1)])]),n("div",Kt,[n("div",{class:"ls-meta-text system-name",title:`ชื่อลูกค้าในระบบ: ${t.name}`},i(ee(t)),9,Qt),n("div",{class:"ls-meta-text payment-text",onClick:I(l=>te(t),["stop"]),title:"คลิกเพื่อสลับ โอน / COD"},i(O(t)),9,Zt)])])),n("div",Gt,i(c.value.thankYouText||"🙏 ขอบคุณที่อุดหนุนนะคะ ❤️"),1)],2))),128))],2)]),oe.value?(r(),Ae(Be,{key:0,customer:oe.value,addressBook:ae.addressBook,onClose:e[19]||(e[19]=t=>A.value=null)},null,8,["customer","addressBook"])):h("",!0)]))}},is=Te(Jt,[["__scopeId","data-v-c37f1d69"]]);export{is as default};
