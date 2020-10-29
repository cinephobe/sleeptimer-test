let Sleeptimer = function (options) {

    let markup = `
  <div class="modal-backdrop" style="display: none"></div>
  <div class="modal" tabindex="-1">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">set sleep timer</h5>
        <button type="button" class="btn-close" data-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div class="container-fluid">
          <div hidden class="has-active-timer row mb-4">
            <div class="col-12 text-center">      
                <span id="current-sleep-timer" class="display-2">00:00:00</span> 
                <br>
                <a href="#" class="btn btn-link text-white btn-lg" data-unset="true">clear timer</a>
            </div>
          </div>
          <div class="row">
          <div class="col-6 col-md-8">
          
            <select class="form-control-lg w-100" name="" id="sleep-timer-select"></select>
           </div>
           <div class="col-6 col-md-4">
                <a href="#" class="btn btn-primary btn-lg w-100" data-set="true">set timer</a>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>

  `,
        wrapper = document.createElement('div'),
        modalBox, backdrop;

    wrapper.innerHTML = markup;
    wrapper.classList.add('nsbs');
    wrapper.classList.add('sleeptimer');

    document.body.appendChild(wrapper);

    modalBox = wrapper.querySelector('.modal');
    backdrop = wrapper.querySelector('.modal-backdrop');

    let
        minuteSteps = ['off', 5, 10, 15, 30, 45, 60],
        select = modalBox.querySelector('select'),
        sleepTimeout,
        timeoutEndsAt = null,
        defaultTitleString = 'no sleep timer set',
        getEventsUrl = (key, id, min, max) => `https://www.googleapis.com/calendar/v3/calendars/${id}/events?key=${key}&timeMin=${min}&timeMax=${max}&orderBy=startTime&singleEvents=true`,
        getIso8601Date = (diffInDays, baseDate, time) => {
            baseDate = baseDate || new Date();
            let date = (new Date(+baseDate + (diffInDays * 24 * 60 * 60 * 1000))).toISOString();
            if (time) {
                date = date.replace(/\d+\:\d+\:\d+\.\d+/, time);
            }
            return date;
        },
        min = getIso8601Date(-0.125 /* 3h */),
        max = getIso8601Date(options.daysToLookAhead),
        showModal = () => {
            modalBox.style.display = 'block';
            modalBox.classList.add('show');
            backdrop.style.display = 'block';
            backdrop.classList.add('show');
        },
        closeModal = () => {
            modalBox.style.display = 'none';
            modalBox.classList.remove('show');
            backdrop.style.display = 'none';
            backdrop.classList.remove('show');
        },
        unsetTimer = () => {
            clearTimeout(sleepTimeout);
            sleepTimeout = null;
            timeoutEndsAt = null;
            modalBox.querySelector('.has-active-timer').setAttribute('hidden', 'true');
            options.triggerTarget.querySelector('a').setAttribute('title', defaultTitleString);
            options.triggerTarget.querySelector('a').style.opacity = 0.5;
        }, setTimerDisplay = () => {
            let {hours, mins, secs} = dateToHourMinSec(timeoutEndsAt);
            modalBox.querySelector('#current-sleep-timer').innerText = `${hours}:${mins}:${secs}`;
            options.triggerTarget.querySelector('a').setAttribute('title', `${hours}:${mins}:${secs}`);
            options.triggerTarget.querySelector('a').style.opacity = 1;
        },
        update = setInterval(() => {
            let now = Date.now();
            select
                .querySelectorAll('option:not([disabled])')
                .forEach(option => {
                    let ra = Number(option.dataset.removesAt || Infinity);
                    if (Number(ra) < now) {
                        //whenever one is removed, it must fetch again
                        getOptionsFromGoogle();
                        option.setAttribute('disabled', false);
                        option.style.display = 'none';
                    }
                });
            if (timeoutEndsAt) {
                setTimerDisplay();
            }
        }, 1000),
        dateToHourMinSec = date => {
            date = +date;

            let diff = (date - Date.now()) / 1000,
                h = diff / 3600,
                hours = Math.floor(h),
                mins = Math.floor((diff - (hours * 3600)) / 60),
                secs = Math.floor(diff - (hours * 3600 + mins * 60));

            return {
                hours: String(hours).padStart(2, '0'),
                mins: String(mins).padStart(2, '0'),
                secs: String(secs).padStart(2, '0')
            };
        },
        movieOptionLabel = (item) => {

            let endTime = new Date(item.end.dateTime),
                {hours, mins} = dateToHourMinSec(endTime),
                label = [],
                title = item.summary,
                titleMaxLength = 20;

            //label.push(hours + ':' + mins);

            //label.push('ends at ' + endTime.toTimeString().replace(/\:\d\d\s.*$/, ''))

            label.push('after');
            if (title.length > titleMaxLength) {
                label.push('"'+title.substring(0, titleMaxLength - 3) + '&hellip;"');
            } else {
                label.push('"'+title+'"')
            }
            label.push('ends (' + endTime.toLocaleTimeString() +')')



            return label.join(' ');

        },
        getOptionsFromGoogle = () => {
            fetch(getEventsUrl(options.apiKey, options.calendar, min, max))
                .then(response => response.json())
                .then(json => {
                    json.items.forEach(item => {
                        if (select.querySelector('.item-id-' + item.id)) {
                            console.log('skipping attachment for ' + item.summary)
                            return true;
                        }

                        let endTime = +(new Date(item.end.dateTime)),
                            option = document.createElement('option');

                        option.innerHTML = movieOptionLabel(item);
                        option.dataset.removesAt = endTime - 6e5;
                        option.classList.add('item-id-' + item.id);
                        option.value = endTime;
                        select.appendChild(option);

                    });
                });
        },
        injectStyleSheet = () => {
            let ss = document.createElement('link');
            ss.setAttribute('rel', 'stylesheet');
            ss.setAttribute('href', options.stylesheetToLoad)

            document.querySelector('head').appendChild(ss);
        },
        buildTriggerBox = () => {
            let markup = `
                <a href="#" class="sleep-timer-toggle" style="display:inline-block; width:${options.triggerIconSize}px; height:${options.triggerIconSize}px; opacity:0.5" title="${defaultTitleString}">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </a>            
            `;

            options.triggerTarget.innerHTML = markup;
            options.triggerTarget.addEventListener('click', e => {
                e.preventDefault();
                showModal();
            })
        },
        modalClickEventHandler = event => {
            if (event.target.matches('[data-dismiss]')) {
                return closeModal();
            }

            if (event.target.matches('[data-unset]')) {
                return unsetTimer();
            }

            if (event.target.matches('[data-set]')) {

                let value = select.value,
                    endTime;

                if (value === 'off') {
                    return unsetTimer();
                }

                if (/^minutes/.test(value)) {
                    let actualNumber = Number(value.match(/\d+$/)[0]);
                    endTime = Date.now() + actualNumber * 60 * 1000;
                } else {
                    endTime = Number(value);
                }

                //clear existing timeout
                unsetTimer();
                timeoutEndsAt = endTime;
                sleepTimeout = setTimeout(() => {
                    window.location = options.redirectTo;
                }, endTime - Date.now());

                modalBox.querySelector('.has-active-timer').removeAttribute('hidden');
                setTimerDisplay();
            }
        };

    modalBox.addEventListener('click', modalClickEventHandler);

    minuteSteps.forEach(item => {
        let option = document.createElement('option');
        option.innerText = item === 'off' ? 'off - no sleep timer' : item + ' minutes';
        option.value = item === 'off' ? 'off' : 'minutes:' + item;

        select.appendChild(option);
    });

    injectStyleSheet();
    getOptionsFromGoogle();
    buildTriggerBox();


    return {};
};
