let debtors = JSON.parse(
localStorage.getItem(
"debtors"
)
) || [];

function save() {

localStorage.setItem(
    "debtors",
    JSON.stringify(
        debtors
    )
);

}

function addDebtor() {

const name =

    document
    .getElementById(
        "name"
    )
    .value
    .trim();


const amount =

    Number(

        document
        .getElementById(
            "amount"
        )
        .value

    );


const percent =

    Number(

        document
        .getElementById(
            "percent"
        )
        .value

    );


const date =

    document
    .getElementById(
        "date"
    )
    .value;


if (!name) {

    alert(
        "Введите имя"
    );

    return;

}


if (
    amount <= 0 ||
    isNaN(amount)
) {

    alert(
        "Введите правильную сумму"
    );

    return;

}


if (
    percent < 0 ||
    isNaN(percent)
) {

    alert(
        "Введите правильный процент"
    );

    return;

}


if (!date) {

    alert(
        "Выберите дату"
    );

    return;

}


debtors.push({

    name: name,

    amount: amount,

    percent: percent,

    date: date

});


save();

render();


document
.getElementById(
    "name"
)
.value = "";


document
.getElementById(
    "amount"
)
.value = "";


document
.getElementById(
    "percent"
)
.value = "";

}

function deleteDebtor(
index
) {

const answer =

    confirm(
        "Удалить должника?"
    );


if (!answer) {

    return;

}


debtors.splice(
    index,
    1
);


save();

render();

}

function getWeeks(
date
) {

const start =

    new Date(
        date +
        "T00:00:00"
    );


const now =

    new Date();


const difference =

    now -
    start;


const oneWeek =

    1000 *
    60 *
    60 *
    24 *
    7;


const weeks =

    Math.floor(

        difference /

        oneWeek

    );


return Math.max(
    0,
    weeks
);

}

function money(
number
) {

return number
.toLocaleString(

    "uk-UA",

    {

        minimumFractionDigits:
            2,

        maximumFractionDigits:
            2

    }

);

}

function render() {

const list =

    document
    .getElementById(
        "list"
    );


const allTotal =

    document
    .getElementById(
        "allTotal"
    );


list.innerHTML = "";


let totalMoney = 0;


if (
    debtors.length === 0
) {

    list.innerHTML = `

        <div class="empty">

            Пока нет должников

        </div>

    `;

}


debtors.forEach(

    function(
        debtor,
        index
    ) {

        const weeks =

            getWeeks(
                debtor.date
            );


        const weeklyInterest =

            debtor.amount *

            (
                debtor.percent /
                100
            );


        const interest =

            weeklyInterest *

            weeks;


        const total =

            debtor.amount +

            interest;


        totalMoney +=

            total;


        list.innerHTML += `

            <div class="debt">

                <div class="top">

                    <div class="name">

                        ${debtor.name}

                    </div>

                    <button

                        class="delete"

                        onclick="
                            deleteDebtor(
                                ${index}
                            )
                        "

                    >

                        Удалить

                    </button>

                </div>


                <div class="data">


                    <div class="box">

                        <div class="label">

                            Начальный долг

                        </div>

                        <div class="value">

                            ${money(
                                debtor.amount
                            )} грн

                        </div>

                    </div>


                    <div class="box">

                        <div class="label">

                            Процент

                        </div>

                        <div class="value">

                            ${debtor.percent}%
                            в неделю

                        </div>

                    </div>


                    <div class="box">

                        <div class="label">

                            Прошло недель

                        </div>

                        <div class="value">

                            ${weeks}

                        </div>

                    </div>


                    <div class="box">

                        <div class="label">

                            Сейчас должен

                        </div>

                        <div class="value total">

                            ${money(
                                total
                            )} грн

                        </div>

                    </div>


                </div>

            </div>

        `;

    }

);


allTotal.textContent =

    money(
        totalMoney
    )

    + " грн";

}

document
.getElementById(
"date"
)
.value =

new Date()
.toISOString()
.split(
"T"
)[0];

render();
