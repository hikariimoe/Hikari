## Configuration & Architecture
- [ ] supporting /aicg/ proxies that have keys to them (such as my own)
- [ ] (unlikely) support using multiple proxies at once to circumvent ratelimits (this feels unethical ngl)
- [ ] find a way to optimize prompts (potentially see https://github.com/microsoft/guidance & rewriting it into TS)

## Instructions
- [ ] make instructions configurable (so that they can be enabled or disabled on the fly)
- [ ] searching google images (how has this not been added yet)
- [ ] properly viewing and visiting websites (currently implemented improperly) (should use sth like cheerio to purge any and all script tags)
- [ ] generate images via a stable diffusion model
- [ ] potentially have the ability to read anime/manga lists
- [ ] teach her how to embrace the power of the dark side (aka how to be a proper shitposter)
- [ ] add the ability to search for music and potentially play it (hoooooooooooooooooooooooooooooooooooooooooooooooooooooooooo)
- [/] support discord actions
    - [x?] add the ability for her to delete messages (got moved but dunno if it works)
    - [ ] add the ability to ban/kick users (imagine how fucking hilarious this could be)
    - [ ] add the ability to pin messages and read pinned messages
    - [ ] add the ability to add basic reactions to a message
    - [x] add the ability to change her status

## AI Modeling
- [ ] make a harsh and strictER PROMPT to force gpt-3.5 to act a certain way
- [ ] harshly cleanup Context.ts & document it
- [ ] getting the last few messages in the channel for remembering and preserving previous contexts
- [\] move memory away from postgres and attach it to context (super unfortunate we removed it from the prompts for now)
- [ ] add proper safety measures for sfw environments

## Suggestions:
- [ ] store certain events/actions over pgsql, maybe? (namely the generated events) (gotta have a use for pgsql)
- [ ] let hikari have a twitter account (someone suggested this and i am both all for it but also terrified)

# Dreams
- [ ] commission an artist to make hikari a real anime girl instead of just randomly stealing images off the internet

### LEGEND:
- [ ] | not completed
- [/] | in progress
- [\] | shelved / abandoned / put on hold
- [x] | completed