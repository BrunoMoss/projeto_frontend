$(document).ready(function () {
    var lineChart;
    var barChart;
    var selectedItems = []; // Array para armazenar os itens selecionados

    var table = $('#fundosselecionados').DataTable(
        {
            scrollX: true,
            scrollY: true,
            paging: false,
            bFilter: false,
            bInfo: false
        }
    );
    // Função para adicionar um item à lista de itens selecionados
    function addItemToList(item) {
        selectedItems.push(item);
        updateSelectedItemsList();
    }

    // Função para remover um item da lista de itens selecionados
    function removeItemFromList(item) {
        selectedItems = selectedItems.filter(function (selectedItem) {
            return selectedItem !== item;
        });
        updateSelectedItemsList();
    }

    // Função para atualizar a lista de itens selecionados no HTML
    function updateSelectedItemsList() {
        var selectedItemsList = $('#selected-items-list');
        selectedItemsList.empty(); // Limpa a lista antes de atualizar

        // Adiciona cada item à lista
        selectedItems.forEach(function (item) {
            var listItem = $('<li>').addClass('list-group-item d-flex justify-content-between align-items-center');
            listItem.text(item);

            // Adiciona ícone de remoção ao lado de cada item
            var removeIcon = $('<i>').addClass('fas fa-times text-danger').click(function () {
                removeItemFromList(item);
            });

            // Adiciona o ícone à lista
            listItem.append(removeIcon);

            // Adiciona o item à lista
            selectedItemsList.append(listItem);
        });
    }
    function getRandomColor() {
        var letters = '0123456789ABCDEF';
        var color = '#';
        for (var i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }
    function getRandomColorWithTransparency(k) {
        // Gera um valor hexadecimal aleatório para a cor
        var randomColor = Math.floor(Math.random() * 16777215).toString(16);

        // Preenche com zeros à esquerda, se necessário
        while (randomColor.length < 6) {
            randomColor = '0' + randomColor;
        }

        // Adiciona o fator de transparência à cor (0 a 1)
        var rgbaColor = 'rgba(' +
            parseInt(randomColor.slice(0, 2), 16) + ',' +
            parseInt(randomColor.slice(2, 4), 16) + ',' +
            parseInt(randomColor.slice(4, 6), 16) + ',' +
            k + ')';

        return rgbaColor;
    }
    function log(message) {
        $("<div>").text(message).prependTo("#log");
        $("#log").scrollTop(0);
    }
    $("#startdate, #enddate").datepicker({
        showOtherMonths: true,
        selectOtherMonths: true,
        showButtonPanel: true,
        changeMonth: true,
        changeYear: true,
        yearRange: "1900:2030"
    });
    function split(val) {
        return val.split(/,\s*/);
    }

    function extractLast(term) {
        return split(term).pop();
    }
    function removerLinhasTopFive() {
        // Lógica para remover as linhas adicionadas
        table.rows('.top-five-row').remove().draw();
    }
    function cnpjExisteNaTabela(cnpj) {
        var rows = table.rows().data();
        for (var i = 0; i < rows.length; i++) {
            if (rows[i][1] === cnpj) { // A segunda coluna (índice 1) contém o CNPJ
                return true;
            }
        }
        return false;
    }
    function adicionarLinha(item, top) {
        var newRow = table.row.add([
            item.razao_social,
            item.cnpj,
            item.classe_fundo,
            item.gestor,
            '<i class="fas fa-times text-danger delete-row"></i>'
        ]).draw().nodes().to$();

        if (top) {
            $(newRow).addClass('top-five-row');
        }

        $(newRow).find('td:last-child').addClass('text-center'); // Centraliza o botão
    }
    $('#fundosselecionados tbody').on('click', 'i.delete-row', function () {
        var row = table.row($(this).parents('tr'));

        // Exibe uma confirmação ou faz a exclusão diretamente
        //if (confirm('Deseja realmente excluir esta linha?')) {
        row.remove().draw();
        //}
    });
    async function adicionarTopfive() {
        var startDate = $('#startdate').val();
        var endDate = $('#enddate').val();
        var classe = $('#class-select')[0].value;

        var params = {
            data_inicial: formatApiDate(startDate),
            data_final: formatApiDate(endDate),
            classe: classe
        };
        $.ajax({
            url: 'http://127.0.0.1:5000/topfunds',
            method: 'GET',
            dataType: 'json',
            async: false,
            data: params,  // Adicione os parâmetros aqui
            success: function (data) {
                // Adicione as linhas ao DataTable com base no retorno da API
                $.each(data.fundos, function (index, item) {
                    // Verifica se o CNPJ já existe na tabela antes de adicionar
                    if (!cnpjExisteNaTabela(item.cnpj)) {
                        adicionarLinha(item, true);
                    }
                });
            },
            error: function (error) {
                console.error('Erro ao chamar a API:', error);
            }
        });
    }
    $('#adicionarTopFive').on('change', function () {
        if (this.checked) {
            adicionarTopfive();
            atualizaCotaChart();
        } else {
            removerLinhasTopFive();
            atualizaCotaChart();
        }
    });
    $("#fundo-search").autocomplete({
        source: function (request, response) {
            $.getJSON("http://127.0.0.1:5000/fundo", { razao_social: extractLast(request.term) })
                .done(function (data) {
                    var mappedData = data.fundos.map(function (item) {
                        return {
                            label: item.razao_social,
                            value: item.cnpj + '@' + item.classe_fundo + '@' + item.gestor
                        };
                    });
                    response(mappedData);
                })
                .fail(function (error) {
                    console.error("Erro ao chamar a API:", error);
                });
        },
        minLength: 3,
        focus: function () {
            return false;
        },
        select: function (event, ui) {
            // Adiciona o item selecionado à lista
            fundo = ui.item.label;
            cnpj = ui.item.value.split('@')[0];
            classe = ui.item.value.split('@')[1];
            gestor = ui.item.value.split('@')[2];
            item = { 'razao_social': fundo, 'cnpj': cnpj, 'classe_fundo': classe, 'gestor': gestor };
            adicionarLinha(item, false);
            // Limpa o campo de autocompletar após a seleção
            $(this).val('');
            return false;
        }
    });
    function formatApiDate(dateString) {
        var date = new Date(dateString);
        return date.toISOString(); // Formata para o formato 'YYYY-MM-DDTHH:mm:ss'
    }
    function calcularRentabilidade(cotas) {
        const valorInicial = cotas[0];
        return cotas.map((valorAtual, i) => {

            return (i = 0) ? 100 : (valorAtual / valorInicial) * 100;

        });
    }
    // Função para atualizar o gráfico de linha
    function updateLineChart(data, label) {

        for (let i = 0; i < data.cotas_fundos.length; i++) {
            var labels = data.cotas_fundos[i].cotas.map(item => item.dt_comptc);
            var values = data.cotas_fundos[i].cotas.map(item => item.vl_cota);
            lineChart.data.labels = labels;
            lineChart.data.datasets.push({
                label: data.cotas_fundos[i].razao_social,
                data: calcularRentabilidade(values),
                borderColor: getRandomColorWithTransparency(0.7),
                borderWidth: 2,
                pointRadius: 0,
                fill: false
            });
        }
        // Atualizando o gráfico
        lineChart.update();
    }
    function fetchPortfolioData(data_referencia, values) {
        var apiUrl = 'http://127.0.0.1:5000/portfolio';

        if (barChart) {
            barChart.destroy();
        }
        createBarChart();

        // Crie um objeto FormData
        var formData = new FormData();

        // Adicione os valores à lista (substitua 'values' pelos seus valores reais)
        values.forEach(function (value, index) {
            formData.append('lista_cnpj', value);
        });

        // Adicione outros parâmetros ao FormData, se necessário
        formData.append('data_referencia', formatApiDate(data_referencia));

        // Faça a requisição POST com o objeto FormData
        $.ajax({
            url: apiUrl,
            type: 'POST',
            data: formData,
            contentType: false,
            processData: false,
            success: function (data) {
                // Lógica para processar os dados da API e atualizar o gráfico
                var datasets = data.portfoliosFundos.map(function (portfolio) {
                    return {
                        label: portfolio.razao_social,
                        data: portfolio.portfolio.map(function (ativo) {
                            return {
                                x: ativo.cd_ativo,
                                y: ativo.PnL
                            };
                        }),
                        backgroundColor: getRandomColorWithTransparency(0.7)
                    };
                });
                updateBarChart(datasets);
            },
            error: function (error) {
                console.error("Erro ao chamar a API:", error);
            }
        });

    }
    function fetchData(startDate, endDate, values) {
        // Substitua a URL da API pelo seu endpoint real
        var apiUrl = 'http://127.0.0.1:5000/cota';



        if (lineChart) {
            lineChart.destroy();
        }
        createLineChart();

        // Crie um objeto FormData
        var formData = new FormData();

        // Adicione os valores à lista (substitua 'values' pelos seus valores reais)
        values.forEach(function (value, index) {
            formData.append('lista_cnpj', value);
        });

        // Adicione outros parâmetros ao FormData, se necessário
        formData.append('data_inicial', formatApiDate(startDate));
        formData.append('data_final', formatApiDate(endDate));

        // Faça a requisição POST com o objeto FormData
        $.ajax({
            url: apiUrl,
            type: 'POST',
            data: formData,
            contentType: false,
            processData: false,
            success: function (data) {
                // Lógica para processar os dados da API e atualizar o gráfico
                updateLineChart(data);
            },
            error: function (error) {
                console.error("Erro ao chamar a API:", error);
            }
        });

    }
    function atualizaCotaChart() {
        var startDate = $('#startdate').val();
        var endDate = $('#enddate').val();
        var values = table.column(1).data().toArray()
        populateSelectMenu(startDate, endDate);
        var ref_date = $('#month-select')[0].value  
        // Verificando se todas as informações necessárias estão disponíveis
        if (startDate && endDate && values.length > 0) {
            // Chamando a função para buscar dados da API
            fetchData(startDate, endDate, values);
            fetchPortfolioData(ref_date, values);
        } else {
            console.error('Preencha todas as informações necessárias.');
        }
    }
    // Evento de clique no botão para buscar dados da API
    $('#buscar-dados').on('click', function () {
        atualizaCotaChart();
    });
    // Função para extrair o CNPJ de um item (assumindo que o CNPJ está no final do item)
    function extractCnpj(item) {
        var match = item.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/); // Extrai o CNPJ no formato xx.xxx.xxx/xxxx-xx
        return match ? match[0] : null;
    }
    function createLineChart() {
        var ctx = document.getElementById('lineChart').getContext('2d');
        lineChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            displayFormats: {
                                day: 'DD-MM-YY'
                            }
                        },
                        position: 'bottom'
                    },
                    y: {
                        title: {
                            display: true,
                            text: "Rentabilidade Cota"
                        }
                    }
                }
            }
        });
    }
    function getMonthsBetweenDates(start, end) {
        var result = {
            months: [],
            dates: []
        };
        var currentDate = new Date(start);
        var endDate = new Date(end);

        while (currentDate <= endDate) {
            var month = currentDate.toLocaleString('default', { month: 'long' });
            var year = currentDate.getFullYear();
            result.months.push(month + '-' + year);

            var firstDayOfMonth = new Date(year, currentDate.getMonth(), 1);
            result.dates.push(firstDayOfMonth);

            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        return result;
    }
    $('#month-select').change(function () {
        var values = table.column(1).data().toArray()
        var ref_date = $(this).val();
        fetchPortfolioData(ref_date, values);

    });
    function populateSelectMenu(start, end) {
        var result = getMonthsBetweenDates(start, end);
        var selectMenu = $('#month-select');

        // Limpa o select menu
        selectMenu.empty();

        // Adiciona as opções ao select menu
        $.each(result.months, function (index, value) {
            selectMenu.append($('<option>').text(value).attr('value', result.dates[index]));
        });
    }
    function createBarChart() {
        var ctx = document.getElementById('barChart').getContext('2d');

        var options = {
            scales: {
                x: { stacked: false },
                y: {
                    stacked: false,
                    ticks: {
                        callback: function (value) {
                            return value + "%"; // Adiciona o símbolo de porcentagem aos rótulos do eixo y
                        },
                    },
                    title: {
                        display: true,
                        text: "PnL Ativo"
                    }
                }
            }
        };

        barChart = new Chart(ctx, {
            type: 'bar',
            data: { datasets: [] },
            options: options
        });
    }
    // Função para atualizar o gráfico de linha
    function updateBarChart(data) {

        barChart.data = { datasets: data };
        // Atualizando o gráfico
        barChart.update();
    }




});