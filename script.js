// NESA TECHNOLOGIES

function $(selectors) {
    return document.querySelector(selectors)
}

function $$(selectors) {
    return Array.from(document.querySelectorAll(selectors))
}

function getElements(teamList) {
    const marqueeLetters = $$('.marquee__letter')

    const teams = teamList.reduce((teams, team) => {
        teams[team.name] = $(`.points__team--${team.name}`)
        return teams
    }, {})

    return {
        marqueeLetters,
        teams,
    }
}

function parseTextContent(element) {
    return JSON.parse(element.textContent)
}

class Main {
    elements = {}
    messagesConnectionErrors = 0
    teamList = []
    teamMap = {}
    winner = null

    constructor(teamMap) {
        console.debug('constructor', teamMap)

        this.teamMap = teamMap ?? {}
        this.teamList = Object.values(this.teamMap)
        this.elements = getElements(this.teamList)

        this.messages = this.setupMessages()
    }

    async animate(team) {
        console.debug('update', team)

        const random = (min, max) => {
            min = Math.ceil(min)
            max = Math.floor(max)
            return Math.floor(Math.random() * (max - min + 1) + min)
        }

        const shoot = (angle, scalar) => {
            confetti({
                particleCount: random(5, 10),
                angle: random(angle - 5, angle + 5),
                spread: random(35, 55),
                startVelocity: random(35, 55),
                colors: ['#FFFFFF', team.colorAsHex, team.colorAsHex],
                scalar,
            })
        }

        for (let index = 0; index < 9; index++) {
            setTimeout(shoot, random(0, 200), index * 22.5, random(28, 32) / 10)

            setTimeout(
                shoot,
                random(100, 300),
                index * 22.5,
                random(18, 22) / 10,
            )
        }

        document.documentElement.classList.add('goal', `goal--${team.name}`)

        if (team.points === 10) {
            document.documentElement.classList.add('win', `win--${team.name}`)
        }

        setTimeout(() => {
            this.elements.teams[team.name].textContent = team.points
        }, 150)

        await new Promise((resolve) => {
            this.elements.marqueeLetters
                .at(-1)
                .addEventListener('animationend', resolve)
        })

        document.documentElement.classList.remove('goal', `goal--${team.name}`)
    }

    setupMessages() {
        console.debug('setupMessages')
        // const messages = new EventSource('event-stream')
        const messages = new EventTarget()

        const error = (event) => {
            console.error('event-stream', event)
            ++this.messagesConnectionErrors

            messages.removeEventListener('error', error)
            messages.removeEventListener('team', team)
            messages.close()

            setTimeout(
                () => this.setupMessages(),
                this.messagesConnectionErrors * 3000,
            )
        }

        const open = (event) => {
            console.debug('event-stream', event)
            this.messagesConnectionErrors = 0
        }

        const team = (event) => {
            console.debug('event-stream', event)
            this.update(JSON.parse(event.data))
        }

        messages.addEventListener('error', error)
        messages.addEventListener('open', open)
        messages.addEventListener('team', team)

        return messages
    }

    update(team) {
        console.debug('update', team)

        const incremented = this.teamMap[team.name].points < team.points
        this.teamMap[team.name].points = team.points

        if (incremented && this.winner !== null) {
            return
        } else if (document.documentElement.classList.contains('win')) {
            this.winner = null
            document.documentElement.classList.remove('win', 'win--blue', 'win--red')
        }

        if (incremented) {
            if (team.points === 10) {
                this.winner = team
            }

            this.animate(this.teamMap[team.name])
        } else {
            this.elements.teams[team.name].textContent = team.points
        }
    }
}

const main = new Main(parseTextContent($('#serialized-team-map')))

async function tools(action, name) {
    console.debug('tool', action, name)
    toolsDisable()

    if (action === 'score') {
        const points = main.teamMap[name].points + 1

        main.messages.dispatchEvent(new MessageEvent('team', {
            data: JSON.stringify({
                name,
                points
            })
        }))

        await new Promise((resolve) => {
            main.elements.marqueeLetters
                .at(-1)
                .addEventListener('animationend', resolve)
        })

        toolsEnable()
        return
    }

    if (action === 'win') {
        document.documentElement.classList.toggle('win')
        document.documentElement.classList.toggle(`win--${name}`)

        await new Promise((resolve) => {
            setTimeout(resolve, 200)
        })

        toolsEnable()
        return
    }

    toolsEnable()
    console.error(`unknown tool action: ${action}`)
}

const toolScoreBlue = $('#tool-score-blue')
const toolWinBlue = $('#tool-win-blue')
const toolScoreRed = $('#tool-score-red')
const toolWinRed = $('#tool-win-red')

toolScoreBlue.addEventListener('click', () => tools('score', 'blue'))
toolWinBlue.addEventListener('click', () => tools('win', 'blue'))
toolScoreRed.addEventListener('click', () => tools('score', 'red'))
toolWinRed.addEventListener('click', () => tools('win', 'red'))

function toolsEnable() {
    toolScoreBlue.disabled = false
    toolWinBlue.disabled = false
    toolScoreRed.disabled = false
    toolWinRed.disabled = false
}

function toolsDisable() {
    toolScoreBlue.disabled = true
    toolWinBlue.disabled = true
    toolScoreRed.disabled = true
    toolWinRed.disabled = true
}